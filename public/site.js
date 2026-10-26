// Dedicated site page: location mini-map and photo lightbox.
(() => {
  const el = document.getElementById('mini-map');
  if (el) {
    const lat = Number(el.dataset.lat), lng = Number(el.dataset.lng);
    const lang = document.documentElement.lang;
    const map = new maplibregl.Map({
      container: el, style: KA3D.style(), center: [lng, lat], zoom: 13.2, pitch: 58, bearing: -20,
      maxPitch: 75, cooperativeGestures: true, attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    let satellite = true;
    const label = () => (satellite ? { el: 'Χάρτης', en: 'Map' } : { el: 'Δορυφόρος', en: 'Satellite' })[lang];
    map.addControl(new KA3D.ButtonsControl([{
      render: (b) => (b.textContent = label()),
      onClick: (b) => { satellite = !satellite; KA3D.setSatellite(map, satellite); b.textContent = label(); },
    }]), 'top-left');
    map.on('load', () => {
      el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      KA3D.setTerrain(map, true, 1.5);
      KA3D.setSatellite(map, satellite);
      if (el.dataset.region) KA3D.setRegion(map, el.dataset.region);
    });
    new maplibregl.Marker({ element: KA3D.pinElement(el.dataset.type), anchor: 'bottom', offset: [0, -6] }).setLngLat([lng, lat]).addTo(map);
  }

  const dialog = document.getElementById('lightbox');
  const photos = window.PHOTOS || [];
  if (!dialog || !photos.length) return;
  const img = dialog.querySelector('img');
  const cap = dialog.querySelector('figcaption');
  let index = 0;

  function show(i) {
    index = (i + photos.length) % photos.length;
    const p = photos[index];
    img.src = p.src;
    cap.textContent = [p.caption, p.credit && `© ${p.credit}`, `${index + 1} / ${photos.length}`].filter(Boolean).join(' · ');
  }

  document.querySelectorAll('.gallery-item').forEach((b) =>
    b.addEventListener('click', () => { show(Number(b.dataset.index)); dialog.showModal(); }));
  dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  dialog.querySelector('.lb-prev').hidden = dialog.querySelector('.lb-next').hidden = photos.length < 2;
  dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.tagName === 'FIGURE') dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
})();
