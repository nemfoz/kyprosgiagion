// Shared map helpers for the public map, the site pages and the admin editor.
window.KA = (() => {
  const TYPES = {
    church: { el: 'Ναός', en: 'Church' },
    monastery: { el: 'Μονή', en: 'Monastery' },
    chapel: { el: 'Εκκλησάκι', en: 'Chapel' },
    basilica: { el: 'Βασιλική / Ερείπια', en: 'Basilica / Ruins' },
  };

  let boundariesPromise;
  const boundaries = () => (boundariesPromise ??= fetch('/data/boundaries.geojson').then((r) => r.json()));

  // Custom panes: land shapes sit under the tiles, hill shading is multiplied on top of them.
  function setupMap(map) {
    map.getContainer().classList.add('ka-map');
    if (!map.getPane('land')) map.createPane('land').style.zIndex = 150;
    if (!map.getPane('relief')) map.createPane('relief').style.zIndex = 250;
    return map;
  }

  // The default "map" is built from our own boundaries plus hill shading: no third-party
  // labels or borders, so place names come only from our Greek/English labels.
  function baseLayers(lang = 'el') {
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services';
    const land = L.geoJSON(null, { pane: 'land', interactive: false, style: { stroke: false, fillColor: '#f5f0e4', fillOpacity: 1 } });
    boundaries().then((fc) => land.addData(fc));
    const relief = L.layerGroup([
      land,
      L.tileLayer(`${esri}/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}`, {
        pane: 'relief', maxZoom: 19, maxNativeZoom: 16, opacity: 0.6, attribution: 'Hillshade © Esri',
      }),
    ]);
    const sat = L.tileLayer(`${esri}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    });
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    return lang === 'el'
      ? { 'Χάρτης': relief, 'Δορυφόρος': sat, 'Οδικός (OpenStreetMap)': osm }
      : { Map: relief, Satellite: sat, 'Roads (OpenStreetMap)': osm };
  }

  function icon(type, { active = false, approx = false } = {}) {
    return L.divIcon({
      className: `pin type-${type}${active ? ' active' : ''}${approx ? ' pin-approx' : ''}`,
      html: '<span></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 34],
      tooltipAnchor: [0, -30],
    });
  }

  // A "world with a hole" polygon that fades out everything outside the region.
  async function regionMask(boundaryId) {
    const fc = await boundaries();
    const feature = fc.features.find((f) => f.properties.region === boundaryId);
    if (!feature) return null;
    const world = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
    const polys = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const holes = polys.map((p) => p[0].map(([lng, lat]) => [lat, lng]));
    const group = L.layerGroup([
      L.polygon([world, ...holes], { stroke: false, fillColor: '#efe9dc', fillOpacity: 0.9, interactive: false }),
      ...holes.map((h) => L.polygon(h, { color: '#7b1e2b', weight: 1.5, opacity: 0.55, fill: false, dashArray: '4 4', interactive: false })),
    ]);
    return group;
  }

  function placeLabels(places, lang) {
    return L.layerGroup(places.map((p) =>
      L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', iconSize: [0, 0] }), interactive: false, keyboard: false })
        .bindTooltip(p[lang], { permanent: true, direction: 'bottom', offset: [0, 2], className: `place-label${p.major ? ' major' : ''}` }),
    ));
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  return { TYPES, setupMap, baseLayers, icon, regionMask, placeLabels, esc };
})();
