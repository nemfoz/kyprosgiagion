(() => {
  const { TYPES, baseLayers, icon, regionMask, esc } = KA;
  const view = document.getElementById('view');
  const logoutBtn = document.getElementById('logout');
  let config;

  // ---- helpers -------------------------------------------------------------
  async function api(path, opts = {}) {
    const res = await fetch(`/api/admin${path}`, {
      ...opts,
      headers: opts.body instanceof Blob ? opts.headers : { 'Content-Type': 'application/json', ...opts.headers },
      body: opts.body && !(opts.body instanceof Blob) ? JSON.stringify(opts.body) : opts.body,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/login') { renderLogin(); throw new Error('Η σύνδεση έληξε'); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function toast(msg, error = false) {
    const el = Object.assign(document.createElement('div'), { className: `toast${error ? ' error' : ''}`, textContent: msg });
    document.body.append(el);
    setTimeout(() => el.remove(), error ? 5000 : 2500);
  }

  const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

  // Accepts "35.28, 33.88", "35.28 33.88" or a Google Maps URL containing coordinates.
  function parseCoords(text) {
    const m = String(text).match(/(-?\d{1,2}\.\d+)\s*(?:,|%2C|\s)\s*(-?\d{1,3}\.\d+)/i);
    return m ? [Number(m[1]), Number(m[2])] : null;
  }

  // ---- login ---------------------------------------------------------------
  function renderLogin() {
    logoutBtn.hidden = true;
    view.innerHTML = `
      <form class="login card" id="login-form">
        <h1>Σύνδεση διαχειριστή</h1>
        <label class="field"><span>Κωδικός</span><input type="password" name="password" autocomplete="current-password" required autofocus></label>
        <button class="btn btn-primary" type="submit">Είσοδος</button>
      </form>`;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/login', { method: 'POST', body: { password: e.target.password.value } });
        route();
      } catch (err) { toast('Λάθος κωδικός', true); }
    });
  }

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    renderLogin();
  });

  // ---- list ----------------------------------------------------------------
  async function renderList() {
    const sites = await api('/sites');
    const regionName = (id) => config.regions.find((r) => r.id === id)?.name.el ?? id;
    view.innerHTML = `
      <div class="row">
        <h1>Εκκλησίες & μοναστήρια</h1>
        <span class="muted">${sites.length}</span>
        <span class="spacer"></span>
        <input type="search" class="list-filter" id="filter" placeholder="Φιλτράρισμα…">
        <a class="btn btn-primary" href="#/new">+ Νέα καταχώρηση</a>
      </div>
      <table>
        <thead><tr><th></th><th>Όνομα</th><th class="hide-sm">Τύπος</th><th class="hide-sm">Περιοχή</th><th>Κατάσταση</th><th class="hide-sm">Ενημέρωση</th></tr></thead>
        <tbody>${sites.map((s) => `
          <tr data-id="${s.id}" data-search="${esc([s.name.el, s.name.en, s.slug].join(' ').toLowerCase())}">
            <td>${s.cover ? `<img class="thumb" src="${esc(s.cover)}" alt="">` : `<span class="thumb type-${s.type}">✝</span>`}</td>
            <td><strong>${esc(s.name.el || s.name.en)}</strong><br><span class="muted">${esc(s.name.en)}</span></td>
            <td class="hide-sm"><span class="type-badge type-${s.type}">${TYPES[s.type]?.el ?? s.type}</span></td>
            <td class="hide-sm">${esc(regionName(s.region))}</td>
            <td>
              <span class="status ${s.published ? 'on' : 'off'}">${s.published ? 'Δημοσιευμένο' : 'Πρόχειρο'}</span>
              ${s.coords_verified ? '' : '<br><span class="approx">θέση κατά προσέγγιση</span>'}
            </td>
            <td class="hide-sm muted">${esc(s.updated_at.slice(0, 16))}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    view.querySelector('tbody').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (tr) location.hash = `#/edit/${tr.dataset.id}`;
    });
    document.getElementById('filter').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      view.querySelectorAll('tbody tr').forEach((tr) => (tr.hidden = !tr.dataset.search.includes(q)));
    });
  }

  // ---- editor --------------------------------------------------------------
  const LANG_FIELDS = [
    ['name', 'Όνομα', 'input', ''],
    ['location', 'Τοποθεσία (χωριό, επαρχία)', 'input', ''],
    ['summary', 'Σύντομη περιγραφή', 'textarea rows=3', 'Εμφανίζεται στον χάρτη και στην αρχή της σελίδας.'],
    ['body', 'Κείμενο / Ιστορία', 'textarea class=tall', 'Κενή γραμμή = νέα παράγραφος · ## Επικεφαλίδα · **έντονα** · *πλάγια* · [κείμενο](https://…) · - λίστα'],
    ['facts', 'Στοιχεία (ένα ανά γραμμή)', 'textarea rows=6', 'Μορφή «Ετικέτα: Τιμή», π.χ. «Χρονολόγηση: 12ος αιώνας»'],
    ['sources', 'Πηγές (μία ανά γραμμή)', 'textarea rows=4', 'Επιτρέπονται σύνδεσμοι [κείμενο](https://…)'],
  ];

  async function renderEditor(id) {
    const site = id ? await api(`/sites/${id}`) : {
      slug: '', type: 'church', region: 'karpasia', lat: '', lng: '', published: false, coords_verified: false,
      content: { el: {}, en: {} }, photos: [],
    };
    const isNew = !id;
    let slugTouched = !isNew;

    const langPane = (lang) => `
      <div class="lang-pane stack" data-lang="${lang}" ${lang !== 'el' ? 'hidden' : ''}>
        ${LANG_FIELDS.map(([key, label, tag, help]) => {
          const [el, ...attrs] = tag.split(' ');
          const value = esc(site.content[lang]?.[key] ?? '');
          const control = el === 'input'
            ? `<input name="${lang}.${key}" value="${value}">`
            : `<textarea name="${lang}.${key}" ${attrs.join(' ')}>${value}</textarea>`;
          return `<label class="field"><span>${label}</span>${control}${help ? `<small>${help}</small>` : ''}</label>`;
        }).join('')}
      </div>`;

    view.innerHTML = `
      <div class="row">
        <a href="#/" class="btn btn-ghost">←</a>
        <h1>${isNew ? 'Νέα καταχώρηση' : esc(site.content.el.name || site.content.en.name)}</h1>
        <span class="spacer"></span>
        ${!isNew ? `<a class="btn" href="/site/${esc(site.slug)}" target="_blank">Προβολή σελίδας ↗</a>` : ''}
      </div>
      <form id="site-form" autocomplete="off">
        <div class="editor">
          <section class="stack">
            <div class="card stack">
              <div class="grid2">
                <label class="field"><span>Τύπος</span>
                  <select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${site.type === k ? 'selected' : ''}>${v.el} / ${v.en}</option>`).join('')}</select>
                </label>
                <label class="field"><span>Περιοχή</span>
                  <select name="region">${config.regions.map((r) => `<option value="${r.id}" ${site.region === r.id ? 'selected' : ''}>${esc(r.name.el)}${r.active ? '' : ' (ανενεργή)'}</option>`).join('')}</select>
                </label>
              </div>
              <label class="field"><span>Διεύθυνση σελίδας (slug)</span>
                <input name="slug" value="${esc(site.slug)}" pattern="[a-z0-9-]+" placeholder="π.χ. panagia-theotokos-trikomo">
                <small>/site/<b id="slug-preview">${esc(site.slug) || '…'}</b> · λατινικοί χαρακτήρες, αριθμοί και παύλες</small>
              </label>
              <div class="row">
                <label class="check"><input type="checkbox" name="published" ${site.published ? 'checked' : ''}> Δημοσιευμένο</label>
                <label class="check"><input type="checkbox" name="coords_verified" ${site.coords_verified ? 'checked' : ''}> Επαληθευμένη θέση</label>
              </div>
            </div>

            <div class="card stack">
              <div class="row">
                <div class="tabs" id="lang-tabs">
                  <button type="button" data-lang="el" aria-pressed="true">Ελληνικά</button>
                  <button type="button" data-lang="en" aria-pressed="false">English</button>
                </div>
              </div>
              ${langPane('el')}
              ${langPane('en')}
            </div>
          </section>

          <section class="stack">
            <div class="card stack">
              <h2 style="margin:0;font-size:17px">Θέση στον χάρτη</h2>
              <div id="pick-map"></div>
              <small class="muted">Κάντε κλικ στον χάρτη ή σύρετε το σημάδι. Μπορείτε να επικολλήσετε συντεταγμένες ή σύνδεσμο Google Maps στο πεδίο Lat.</small>
              <div class="grid2">
                <label class="field"><span>Lat</span><input name="lat" value="${site.lat}" inputmode="decimal" required></label>
                <label class="field"><span>Lng</span><input name="lng" value="${site.lng}" inputmode="decimal" required></label>
              </div>
            </div>

            <div class="card stack" id="photos-card">
              <h2 style="margin:0;font-size:17px">Φωτογραφίες</h2>
              ${isNew ? '<p class="muted" style="margin:0">Αποθηκεύστε πρώτα την καταχώρηση για να προσθέσετε φωτογραφίες.</p>' : `
              <div class="photos" id="photos"></div>
              <label class="dropzone" id="dropzone">
                <input type="file" id="photo-files" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
                Σύρετε φωτογραφίες εδώ ή <u>επιλέξτε αρχεία</u>
              </label>
              <label class="field"><span>Φωτογράφος (για τις νέες φωτογραφίες)</span><input id="photo-credit" placeholder="π.χ. Γιώργος Κωνσταντίνου, 2016"></label>
              <div class="row">
                <input id="photo-url" placeholder="ή διεύθυνση εικόνας https://…" style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px">
                <button class="btn" type="button" id="add-url">Προσθήκη</button>
              </div>`}
            </div>
          </section>
        </div>

        <div class="savebar">
          <button class="btn btn-primary" type="submit">${isNew ? 'Δημιουργία' : 'Αποθήκευση'}</button>
          <a class="btn btn-ghost" href="#/">Άκυρο</a>
          <span class="spacer"></span>
          ${!isNew ? '<button class="btn btn-danger" type="button" id="delete">Διαγραφή</button>' : ''}
        </div>
      </form>`;

    const form = document.getElementById('site-form');
    let dirty = false;
    form.addEventListener('input', () => (dirty = true));

    // language tabs
    document.getElementById('lang-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lang]');
      if (!b) return;
      form.querySelectorAll('#lang-tabs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      form.querySelectorAll('.lang-pane').forEach((p) => (p.hidden = p.dataset.lang !== b.dataset.lang));
    });

    // slug follows the English name until edited by hand
    const slugInput = form.elements.slug;
    const slugPreview = document.getElementById('slug-preview');
    slugInput.addEventListener('input', () => { slugTouched = true; slugPreview.textContent = slugInput.value || '…'; });
    form.elements['en.name'].addEventListener('input', (e) => {
      if (slugTouched) return;
      slugInput.value = slugify(e.target.value);
      slugPreview.textContent = slugInput.value || '…';
    });

    // coordinate picker
    const latInput = form.elements.lat, lngInput = form.elements.lng;
    const pick = KA.setupMap(L.map('pick-map'));
    const layers = baseLayers('el');
    Object.values(layers)[1].addTo(pick); // satellite: precise placement
    L.control.layers(layers, null, { position: 'topright' }).addTo(pick);
    regionMask('famagusta').then((m) => m?.addTo(pick));
    const hasPos = latInput.value && lngInput.value;
    const start = hasPos ? [Number(latInput.value), Number(lngInput.value)] : [35.45, 34.15];
    pick.setView(start, hasPos ? 14 : 9);
    const marker = L.marker(start, { draggable: true, icon: icon(site.type) });
    if (hasPos) marker.addTo(pick);

    function setPos(lat, lng, pan = false) {
      latInput.value = lat.toFixed(6);
      lngInput.value = lng.toFixed(6);
      marker.setLatLng([lat, lng]).addTo(pick);
      if (pan) pick.setView([lat, lng], Math.max(pick.getZoom(), 14));
      dirty = true;
    }
    pick.on('click', (e) => setPos(e.latlng.lat, e.latlng.lng));
    marker.on('dragend', () => { const p = marker.getLatLng(); setPos(p.lat, p.lng); });
    form.elements.type.addEventListener('change', (e) => marker.setIcon(icon(e.target.value)));
    latInput.addEventListener('paste', (e) => {
      const c = parseCoords(e.clipboardData.getData('text'));
      if (c) { e.preventDefault(); setPos(c[0], c[1], true); }
    });
    [latInput, lngInput].forEach((i) => i.addEventListener('change', () => {
      const lat = Number(latInput.value), lng = Number(lngInput.value);
      if (Number.isFinite(lat) && Number.isFinite(lng) && latInput.value && lngInput.value) setPos(lat, lng, true);
    }));

    // save
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements;
      const content = { el: {}, en: {} };
      for (const lang of ['el', 'en']) for (const [key] of LANG_FIELDS) content[lang][key] = f[`${lang}.${key}`].value;
      const body = {
        slug: f.slug.value || slugify(content.en.name || content.el.name),
        type: f.type.value, region: f.region.value,
        lat: f.lat.value, lng: f.lng.value,
        published: f.published.checked, coords_verified: f.coords_verified.checked,
        content,
      };
      try {
        const saved = await api(isNew ? '/sites' : `/sites/${id}`, { method: isNew ? 'POST' : 'PUT', body });
        dirty = false;
        toast('Αποθηκεύτηκε');
        if (isNew) location.hash = `#/edit/${saved.id}`;
        else view.querySelector('h1').textContent = saved.content.el.name || saved.content.en.name;
      } catch (err) { toast(err.message, true); }
    });

    document.getElementById('delete')?.addEventListener('click', async () => {
      if (!confirm('Οριστική διαγραφή αυτής της καταχώρησης και των φωτογραφιών της;')) return;
      await api(`/sites/${id}`, { method: 'DELETE' });
      toast('Διαγράφηκε');
      location.hash = '#/';
    });

    window.onbeforeunload = () => (dirty ? true : undefined);
    if (!isNew) setupPhotos(site);
  }

  // ---- photos --------------------------------------------------------------
  function setupPhotos(site) {
    let photos = site.photos;
    const list = document.getElementById('photos');

    function render() {
      list.innerHTML = photos.map((p, i) => `
        <div class="photo" data-id="${p.id}">
          <img src="${esc(p.src)}" alt="">
          <div class="stack" style="gap:6px">
            <label class="field"><input data-k="caption_el" value="${esc(p.caption_el)}" placeholder="Λεζάντα (ΕΛ)"></label>
            <label class="field"><input data-k="caption_en" value="${esc(p.caption_en)}" placeholder="Caption (EN)"></label>
            <label class="field"><input data-k="credit" value="${esc(p.credit)}" placeholder="Φωτογράφος / ©"></label>
            <div class="row">
              <button class="btn" type="button" data-move="-1" ${i === 0 ? 'disabled' : ''} title="Μετακίνηση πάνω">↑</button>
              <button class="btn" type="button" data-move="1" ${i === photos.length - 1 ? 'disabled' : ''} title="Μετακίνηση κάτω">↓</button>
              ${i === 0 ? '<span class="muted" style="font-size:12px">Κύρια φωτογραφία</span>' : ''}
              <span class="spacer"></span>
              <button class="btn btn-danger" type="button" data-del>Διαγραφή</button>
            </div>
          </div>
        </div>`).join('');
    }
    render();

    const save = (p) => api(`/photos/${p.id}`, { method: 'PUT', body: p });

    list.addEventListener('change', async (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      const p = photos.find((x) => x.id === Number(e.target.closest('.photo').dataset.id));
      p[k] = e.target.value;
      try { await save(p); toast('Η φωτογραφία ενημερώθηκε'); } catch (err) { toast(err.message, true); }
    });

    list.addEventListener('click', async (e) => {
      const card = e.target.closest('.photo');
      if (!card) return;
      const i = photos.findIndex((x) => x.id === Number(card.dataset.id));
      if (e.target.closest('[data-del]')) {
        if (!confirm('Διαγραφή φωτογραφίας;')) return;
        await api(`/photos/${photos[i].id}`, { method: 'DELETE' });
        photos.splice(i, 1);
        render();
      }
      const move = Number(e.target.closest('[data-move]')?.dataset.move);
      if (move) {
        [photos[i], photos[i + move]] = [photos[i + move], photos[i]];
        photos.forEach((p, n) => (p.sort = n));
        render();
        await Promise.all(photos.map(save));
      }
    });

    async function upload(files) {
      const credit = document.getElementById('photo-credit').value;
      for (const file of files) {
        try {
          const body = await shrink(file);
          const p = await api(`/sites/${site.id}/photos/upload`, {
            method: 'POST', body,
            headers: { 'Content-Type': body.type, 'X-Credit': encodeURIComponent(credit) },
          });
          p.credit = credit;
          photos.push(p);
          render();
        } catch (err) { toast(`${file.name}: ${err.message}`, true); }
      }
    }

    const dz = document.getElementById('dropzone');
    document.getElementById('photo-files').addEventListener('change', (e) => upload([...e.target.files]));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); upload([...e.dataTransfer.files]); });

    document.getElementById('add-url').addEventListener('click', async () => {
      const input = document.getElementById('photo-url');
      try {
        const p = await api(`/sites/${site.id}/photos`, { method: 'POST', body: { src: input.value.trim(), credit: document.getElementById('photo-credit').value } });
        photos.push(p);
        input.value = '';
        render();
      } catch (err) { toast(err.message, true); }
    });
  }

  // Resize large photos in the browser (max 2400 px, JPEG) so uploads stay small and fast.
  async function shrink(file, max = 2400) {
    if (file.type === 'image/gif') return file;
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2.5e6) return file;
    const canvas = Object.assign(document.createElement('canvas'), {
      width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale),
    });
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  }

  // ---- router --------------------------------------------------------------
  async function route() {
    window.onbeforeunload = null;
    const { admin } = await fetch('/api/admin/me').then((r) => r.json());
    if (!admin) return renderLogin();
    logoutBtn.hidden = false;
    config ??= await fetch('/api/config').then((r) => r.json());
    const [, page, id] = location.hash.split('/');
    try {
      if (page === 'new') await renderEditor(null);
      else if (page === 'edit' && id) await renderEditor(Number(id));
      else await renderList();
    } catch (err) { toast(err.message, true); }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
