(async () => {
  const { TYPES, esc } = KA;

  const UI = {
    search: { el: 'Αναζήτηση εκκλησίας ή χωριού…', en: 'Search a church or village…' },
    count: { el: (n) => `${n} ${n === 1 ? 'μνημείο' : 'μνημεία'}`, en: (n) => `${n} ${n === 1 ? 'monument' : 'monuments'}` },
    none: { el: 'Δεν βρέθηκαν αποτελέσματα.', en: 'No results.' },
    more: { el: 'Δείτε ολόκληρη τη σελίδα →', en: 'View full page →' },
    back: { el: '← Όλα τα μνημεία', en: '← All monuments' },
    approx: { el: 'Κατά προσέγγιση θέση', en: 'Approximate location' },
  };

  const params = new URLSearchParams(location.search);
  const storedLang = (() => { try { return localStorage.getItem('lang'); } catch { return null; } })();
  const state = {
    lang: params.get('lang') || storedLang || 'el',
    region: params.get('region'),
    types: new Set(Object.keys(TYPES)),
    query: '',
    selected: null,
  };

  const [config, sites] = await Promise.all([
    fetch('/api/config').then((r) => r.json()),
    fetch('/api/sites').then((r) => r.json()),
  ]);
  const regions = config.regions.filter((r) => r.active);
  if (!regions.some((r) => r.id === state.region)) state.region = config.defaultRegion;

  // Sites belong to a region and, transitively, to its parent regions.
  const ancestors = (id) => {
    const r = config.regions.find((x) => x.id === id);
    return r ? [id, ...(r.parent ? ancestors(r.parent) : [])] : [id];
  };
  sites.forEach((s) => (s.regions = ancestors(s.region)));

  // ---- map -----------------------------------------------------------------
  const { style, setRegion, setTerrain, setSatellite, pinElement, ButtonsControl } = KA3D;
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('mapPrefs')) || {}; } catch { return {}; } })();
  const view = { is3d: prefs.is3d ?? true, satellite: prefs.satellite ?? false };
  const savePrefs = () => { try { localStorage.setItem('mapPrefs', JSON.stringify(view)); } catch {} };

  const map = new maplibregl.Map({
    container: 'map',
    style: style(),
    center: [33.4, 35.1], zoom: 7.6, // whole island first, then fly into the region
    maxPitch: 75, minZoom: 7, attributionControl: { compact: true },
  });
  map.getContainer().classList.add('ka-map3d');
  map.on('error', (e) => console.error('map error:', e.error?.message ?? e.error ?? e));
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  const ui = {
    '3d': { el: ['3D', '2D'], en: ['3D', '2D'] },
    sat: { el: ['Δορυφόρος', 'Χάρτης'], en: ['Satellite', 'Map'] },
  };
  const toggles = new ButtonsControl([
    { render: (b) => (b.textContent = ui['3d'][state.lang][view.is3d ? 1 : 0]), onClick: (b) => { view.is3d = !view.is3d; apply3d(); b.textContent = ui['3d'][state.lang][view.is3d ? 1 : 0]; savePrefs(); } },
    { render: (b) => (b.textContent = ui.sat[state.lang][view.satellite ? 1 : 0]), onClick: (b) => { view.satellite = !view.satellite; setSatellite(map, view.satellite); b.textContent = ui.sat[state.lang][view.satellite ? 1 : 0]; savePrefs(); } },
  ]);
  map.addControl(toggles, 'top-right');
  const refreshToggles = () => { map.removeControl(toggles); map.addControl(toggles, 'top-right'); };

  const markers = new Map();
  const labelMarkers = [];
  let hoverPopup;

  const region = () => config.regions.find((r) => r.id === state.region);

  function regionCamera() {
    const r = region();
    const [[s, w], [n, e]] = r.bounds;
    const bearing = view.is3d ? r.camera?.bearing ?? 0 : 0;
    const cam = map.cameraForBounds([[w, s], [e, n]], { bearing, padding: 30 });
    return { ...cam, bearing, pitch: view.is3d ? r.camera?.pitch ?? 50 : 0, zoom: cam.zoom + (view.is3d ? (map.getContainer().clientWidth > 700 ? 0.35 : -0.1) : 0) };
  }

  function apply3d() {
    setTerrain(map, view.is3d);
    const sel = sites.find((x) => x.id === state.selected);
    if (sel) map.easeTo({ pitch: view.is3d ? 60 : 0, bearing: view.is3d ? map.getBearing() : 0, duration: 800 });
    else map.easeTo({ ...regionCamera(), duration: 900 });
  }

  function drawLabels() {
    labelMarkers.splice(0).forEach((m) => m.remove());
    for (const p of config.places) {
      const el = Object.assign(document.createElement('div'), { className: `place-label${p.major ? ' major' : ''}`, textContent: p[state.lang] });
      labelMarkers.push(new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, 4] }).setLngLat([p.lng, p.lat]).addTo(map));
    }
    updateLabelVisibility();
  }
  const updateLabelVisibility = () => map.getContainer().classList.toggle('show-minor', map.getZoom() >= 10.3);
  map.on('zoom', updateLabelVisibility);

  async function showRegion(fit = true) {
    await setRegion(map, region().boundary);
    if (fit) map.flyTo({ ...regionCamera(), duration: 2200, essential: true, curve: 1.2 });
  }
  // ---- rendering -----------------------------------------------------------
  const t = (o) => o[state.lang];
  const name = (s) => s.name[state.lang] || s.name.el || s.name.en;
  const loc = (s) => s.location[state.lang] || s.location.el;

  function visibleSites() {
    const q = state.query.trim().toLocaleLowerCase('el').normalize('NFD').replace(/[̀-ͯ]/g, '');
    return sites.filter((s) => {
      if (!s.regions.includes(state.region) || !state.types.has(s.type)) return false;
      if (!q) return true;
      const hay = [s.name.el, s.name.en, s.location.el, s.location.en].join(' ')
        .toLocaleLowerCase('el').normalize('NFD').replace(/[̀-ͯ]/g, '');
      return hay.includes(q);
    });
  }

  function renderMarkers() {
    const visible = new Set(visibleSites().map((s) => s.id));
    for (const s of sites) {
      let m = markers.get(s.id);
      if (!m) {
        const el = pinElement(s.type, { approx: !s.coords_verified });
        el.addEventListener('click', (e) => { e.stopPropagation(); select(s.id); });
        el.addEventListener('mouseenter', () => showTip(s));
        el.addEventListener('mouseleave', () => hoverPopup?.remove());
        m = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -6] }).setLngLat([s.lng, s.lat]);
        markers.set(s.id, m);
      }
      m.getElement().classList.toggle('active', state.selected === s.id);
      m.getElement().style.zIndex = state.selected === s.id ? 2 : 1;
      visible.has(s.id) ? m.addTo(map) : m.remove();
    }
  }

  function showTip(s) {
    hoverPopup?.remove();
    hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 36, className: 'site-tip' })
      .setLngLat([s.lng, s.lat]).setText(name(s)).addTo(map);
  }

  const panelBody = document.getElementById('panel-body');
  const panelHead = document.getElementById('panel-head');

  function thumb(s) {
    return s.cover
      ? `<img class="thumb" src="${esc(s.cover)}" alt="" loading="lazy">`
      : `<span class="thumb type-${s.type}" aria-hidden="true">✝</span>`;
  }

  function renderPanel() {
    const s = sites.find((x) => x.id === state.selected);
    panelHead.hidden = !!s;
    if (s) {
      const href = `/site/${encodeURIComponent(s.slug)}?lang=${state.lang}`;
      panelBody.innerHTML = `
        <div class="detail">
          <button class="link-back" type="button" data-action="back">${t(UI.back)}</button>
          <div class="detail-inner">
            <span class="type-badge type-${s.type}">${esc(TYPES[s.type]?.[state.lang] ?? s.type)}</span>
            <h2>${esc(name(s))}</h2>
            <p class="loc">${esc(loc(s))}</p>
            ${!s.coords_verified ? `<p class="approx">${t(UI.approx)}</p>` : ''}
          </div>
          ${s.cover ? `<a href="${href}"><img class="detail-img" src="${esc(s.cover)}" alt=""></a>` : ''}
          <div class="detail-inner">
            <p>${esc(s.summary[state.lang] || s.summary.el)}</p>
            <a class="btn btn-primary btn-block" href="${href}">${t(UI.more)}</a>
          </div>
        </div>`;
      return;
    }
    const list = visibleSites().sort((a, b) => name(a).localeCompare(name(b), state.lang));
    panelBody.innerHTML = `
      <div class="count">${t(UI.count)(list.length)}</div>
      ${list.length ? `<ul class="site-list">${list.map((x) => `
        <li><button type="button" data-id="${x.id}">
          ${thumb(x)}
          <span><span class="name">${esc(name(x))}</span><span class="loc">${esc(loc(x))}</span></span>
        </button></li>`).join('')}</ul>` : `<p class="count">${t(UI.none)}</p>`}`;
  }

  panelBody.addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (item) return select(Number(item.dataset.id));
    if (e.target.closest('[data-action=back]')) { select(null); map.flyTo({ ...regionCamera(), duration: 1500 }); }
  });
  panelBody.addEventListener('mouseover', (e) => {
    const item = e.target.closest('[data-id]');
    if (item) showTip(sites.find((x) => x.id === Number(item.dataset.id)));
  });
  panelBody.addEventListener('mouseleave', () => hoverPopup?.remove());

  function select(id, { pan = true } = {}) {
    state.selected = id;
    const s = sites.find((x) => x.id === id);
    hoverPopup?.remove();
    if (s && pan) {
      map.flyTo({
        center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 13.2),
        pitch: view.is3d ? 62 : 0, bearing: view.is3d ? map.getBearing() - 15 : 0,
        duration: 2000, essential: true,
      });
    }
    renderMarkers();
    renderPanel();
    syncUrl();
  }
  map.on('click', () => {
    if (!state.selected) return;
    select(null);
    map.flyTo({ ...regionCamera(), duration: 1500 });
  });

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.lang !== 'el') p.set('lang', state.lang);
    if (state.region !== config.defaultRegion) p.set('region', state.region);
    const s = sites.find((x) => x.id === state.selected);
    if (s) p.set('site', s.slug);
    history.replaceState(null, '', `${location.pathname}${p.size ? '?' + p : ''}`);
  }

  // ---- controls ------------------------------------------------------------
  const regionTabs = document.getElementById('region-tabs');
  const typeFilters = document.getElementById('type-filters');
  const search = document.getElementById('search');
  const langBtn = document.getElementById('lang-toggle');

  function renderChrome() {
    document.documentElement.lang = state.lang;
    document.title = config.siteTitle[state.lang];
    document.getElementById('site-title').textContent = config.siteTitle[state.lang];
    langBtn.textContent = state.lang === 'el' ? 'EN' : 'ΕΛ';
    search.placeholder = t(UI.search);
    regionTabs.hidden = regions.length < 2;
    regionTabs.innerHTML = regions.map((r) =>
      `<button type="button" data-region="${r.id}" aria-pressed="${r.id === state.region}">${esc(r.name[state.lang])}</button>`).join('');
    typeFilters.innerHTML = Object.entries(TYPES).map(([k, v]) =>
      `<button type="button" class="chip type-${k}" data-type="${k}" aria-pressed="${state.types.has(k)}"><span class="dot"></span>${v[state.lang]}</button>`).join('');
  }

  regionTabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-region]');
    if (!b || b.dataset.region === state.region) return;
    state.region = b.dataset.region;
    state.selected = null;
    renderChrome(); showRegion(); renderMarkers(); renderPanel(); syncUrl();
  });
  typeFilters.addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    const k = b.dataset.type;
    state.types.has(k) ? state.types.delete(k) : state.types.add(k);
    b.setAttribute('aria-pressed', state.types.has(k));
    renderMarkers(); renderPanel();
  });
  search.addEventListener('input', () => { state.query = search.value; renderMarkers(); renderPanel(); });
  langBtn.addEventListener('click', () => {
    state.lang = state.lang === 'el' ? 'en' : 'el';
    try { localStorage.setItem('lang', state.lang); } catch {}
    renderChrome(); refreshToggles(); drawLabels(); renderMarkers(); renderPanel(); syncUrl();
  });

  // ---- start ---------------------------------------------------------------
  renderChrome();
  await new Promise((r) => (map.loaded() ? r() : map.once('load', r)));
  map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  setTerrain(map, view.is3d);
  setSatellite(map, view.satellite);
  drawLabels();
  const initial = sites.find((s) => s.slug === params.get('site'));
  await showRegion(!initial);
  if (initial) select(initial.id);
  else { renderMarkers(); renderPanel(); }
})();
