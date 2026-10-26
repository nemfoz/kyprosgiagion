// 3D map (MapLibre GL) shared by the public map and the site pages.
// The admin keeps the simpler 2D Leaflet map in common.js.
window.KA3D = (() => {
  const COLORS = {
    sea: '#c4d9dc',
    island: '#e6e0d2',
    land: '#f6eedd',
    mask: '#dfe8e7',
    accent: '#7b1e2b',
  };
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const WORLD = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  // Mapterhorn: open terrain tiles (sea level = 0, so the sea stays flat in 3D).
  const DEM = {
    type: 'raster-dem',
    tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
    encoding: 'terrarium', tileSize: 512, maxzoom: 12,
    attribution: '<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>',
  };

  let boundariesPromise;
  const boundaries = () => (boundariesPromise ??= fetch('/data/boundaries.geojson').then((r) => r.json()));

  function style() {
    return {
      version: 8,
      sources: {
        terrain: DEM,
        hillshade: DEM, // separate source instance, as recommended for terrain + hillshade
        satellite: {
          type: 'raster', tileSize: 256, maxzoom: 19,
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
        },
        cyprus: { type: 'geojson', data: '/data/cyprus.geojson', attribution: 'Natural Earth' },
        mask: { type: 'geojson', data: EMPTY },
        region: { type: 'geojson', data: EMPTY, attribution: 'Boundaries © OpenStreetMap contributors' },
      },
      layers: [
        { id: 'sea', type: 'background', paint: { 'background-color': COLORS.sea } },
        { id: 'island', type: 'fill', source: 'cyprus', paint: { 'fill-color': COLORS.island } },
        { id: 'land', type: 'fill', source: 'region', paint: { 'fill-color': COLORS.land } },
        { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' }, paint: { 'raster-saturation': -0.1 } },
        {
          id: 'hillshade', type: 'hillshade', source: 'hillshade',
          paint: {
            'hillshade-exaggeration': 0.55,
            'hillshade-shadow-color': '#4e3b2c',
            'hillshade-highlight-color': '#fffaf0',
            'hillshade-accent-color': '#8c6f52',
            'hillshade-illumination-direction': 315,
          },
        },
        { id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': COLORS.mask, 'fill-opacity': 0.86 } },
        { id: 'region-glow', type: 'line', source: 'region', paint: { 'line-color': COLORS.accent, 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.28 } },
        { id: 'region-line', type: 'line', source: 'region', paint: { 'line-color': COLORS.accent, 'line-width': 1.6, 'line-opacity': 0.8 } },
      ],
      sky: {
        'sky-color': '#bcd6e6',
        'horizon-color': '#f4efe4',
        'fog-color': '#f1ece1',
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.7,
        'fog-ground-blend': 0.8,
        'atmosphere-blend': 0.6,
      },
    };
  }

  // Highlights one region: its land is drawn warm and outlined, everything outside is faded.
  async function setRegion(map, boundaryId) {
    const fc = await boundaries();
    const feature = fc.features.find((f) => f.properties.region === boundaryId);
    const polys = !feature ? [] : feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    map.getSource('region').setData(feature ?? EMPTY);
    map.getSource('mask').setData(!feature ? EMPTY : {
      type: 'Feature', properties: {},
      geometry: { type: 'Polygon', coordinates: [WORLD, ...polys.map((p) => p[0])] },
    });
  }

  function setTerrain(map, on, exaggeration = 1.8) {
    map.setTerrain(on ? { source: 'terrain', exaggeration } : null);
  }

  function setSatellite(map, on) {
    map.setLayoutProperty('satellite', 'visibility', on ? 'visible' : 'none');
    map.setPaintProperty('hillshade', 'hillshade-exaggeration', on ? 0.25 : 0.55);
  }

  function pinElement(type, { approx = false } = {}) {
    const el = document.createElement('div');
    el.className = `pin type-${type}${approx ? ' pin-approx' : ''}`;
    el.innerHTML = '<span></span>';
    return el;
  }

  // Small map control with text buttons, e.g. 3D/2D and Map/Satellite toggles.
  class ButtonsControl {
    constructor(buttons) { this.buttons = buttons; }
    onAdd() {
      this.el = document.createElement('div');
      this.el.className = 'maplibregl-ctrl maplibregl-ctrl-group ka-ctrl';
      for (const b of this.buttons) {
        const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'ka-ctrl-btn' });
        btn.addEventListener('click', () => b.onClick(btn));
        b.render(btn);
        this.el.append(btn);
      }
      return this.el;
    }
    onRemove() { this.el.remove(); }
  }

  return { COLORS, style, setRegion, setTerrain, setSatellite, pinElement, ButtonsControl };
})();
