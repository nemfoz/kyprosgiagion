// Seeds the editions (data/editions.json) and the regions (data/regions.json, with outlines from
// public/data/boundaries.geojson, plus the Cyprus districts from public/data/cyprus-districts.geojson) into the
// database. Only adds what is missing — whatever superadmins changed at /admin/editions and /admin/regions stays.
import fs from 'node:fs';

const read = (rel) => {
  const file = new URL(`../${rel}`, import.meta.url);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
};

// Bounding box [[south, west], [north, east]] of a (Multi)Polygon.
export function geometryBounds(g) {
  let s = 90, w = 180, n = -90, e = -180;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const [lng, lat] of poly[0]) {
    s = Math.min(s, lat); n = Math.max(n, lat); w = Math.min(w, lng); e = Math.max(e, lng);
  }
  const r = (x) => Math.round(x * 100) / 100;
  return [[r(s), r(w)], [r(n), r(e)]];
}

const SORT = ['famagusta', 'karpasia', 'nicosia', 'kyrenia', 'larnaca', 'limassol', 'paphos'];

export async function seedGeo(db) {
  let added = 0;
  for (const e of read('data/editions.json').editions) {
    const content = { name: e.name, church: e.church, title: e.title ?? e.name, intro: e.intro ?? { el: '', en: '' } };
    const r = await db.execute({
      sql: `INSERT OR IGNORE INTO editions (id, sort, content, active, bounds, camera, default_region, countries) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [e.id, e.sort, JSON.stringify(content), e.active ? 1 : 0, JSON.stringify(e.bounds), e.camera ? JSON.stringify(e.camera) : null, e.defaultRegion ?? null, JSON.stringify(e.countries ?? [])],
    });
    added += r.rowsAffected;
  }

  const outlines = new Map();
  for (const f of read('public/data/boundaries.geojson')?.features ?? []) outlines.set(f.properties.region, f.geometry);
  const districts = read('public/data/cyprus-districts.geojson')?.features ?? [];
  for (const f of districts) if (!outlines.has(f.properties.region)) outlines.set(f.properties.region, f.geometry);

  const regions = [...read('data/regions.json').regions];
  for (const f of districts) {
    if (!regions.some((r) => r.id === f.properties.region)) {
      regions.push({ id: f.properties.region, name: f.properties.name, bounds: f.properties.bounds ?? geometryBounds(f.geometry), active: false });
    }
  }
  for (const r of regions) {
    const boundary = outlines.get(r.boundary ?? r.id);
    const sort = SORT.includes(r.id) ? SORT.indexOf(r.id) : 50;
    const res = await db.execute({
      sql: `INSERT OR IGNORE INTO regions (id, edition, parent, sort, name, bounds, camera, boundary, active) VALUES (?, 'cyprus', ?, ?, ?, ?, ?, ?, ?)`,
      args: [r.id, r.parent ?? null, sort, JSON.stringify(r.name), JSON.stringify(r.bounds), r.camera ? JSON.stringify(r.camera) : null, boundary ? JSON.stringify(boundary) : null, r.active ? 1 : 0],
    });
    added += res.rowsAffected;
    // Outlines that arrived later (e.g. the districts file) fill regions that had none.
    if (!res.rowsAffected && boundary) {
      await db.execute({ sql: 'UPDATE regions SET boundary = ? WHERE id = ? AND boundary IS NULL', args: [JSON.stringify(boundary), r.id] });
    }
  }
  return added;
}
