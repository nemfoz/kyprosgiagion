import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import regionsJson from '../data/regions.json' with { type: 'json' };
import { seedSites } from './seed.js';
import { SCHEMA } from './schema.js';

// Local development uses a SQLite file; on Vercel set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN).
const DB_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  || `file:${fileURLToPath(new URL('../data/app.db', import.meta.url))}`;

export const db = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
});

await db.batch(SCHEMA, 'write');

// Plain objects keyed by column name.
async function all(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}
const get = async (sql, args) => (await all(sql, args))[0];
const run = (sql, args = []) => db.execute({ sql, args });

export const SITE_TYPES = ['church', 'monastery', 'chapel', 'basilica'];
const LANGS = ['el', 'en'];
const TEXT_FIELDS = ['name', 'location', 'summary', 'body', 'facts', 'sources'];

// Normalises the bilingual content blob so every language has every field.
export function normaliseContent(input = {}) {
  const out = {};
  for (const lang of LANGS) {
    out[lang] = {};
    for (const f of TEXT_FIELDS) out[lang][f] = String(input?.[lang]?.[f] ?? '').trim();
  }
  return out;
}

function rowToSite(row) {
  if (!row) return null;
  return {
    ...row,
    coords_verified: !!row.coords_verified,
    published: !!row.published,
    content: normaliseContent(JSON.parse(row.content)),
  };
}

export async function listSites({ publishedOnly = true, region } = {}) {
  const where = [];
  const args = {};
  if (publishedOnly) where.push('published = 1');
  if (region) {
    // A region also contains the sites of its sub-regions (e.g. famagusta ⊃ karpasia).
    where.push('(region = :region OR region IN (SELECT value FROM json_each(:children)))');
    args.region = region;
    args.children = JSON.stringify(childRegions(region));
  }
  const sql = `SELECT s.*, (SELECT src FROM photos p WHERE p.site_id = s.id ORDER BY sort, id LIMIT 1) AS cover
               FROM sites s ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.id`;
  return (await all(sql, args)).map(rowToSite);
}

export async function getSite({ id, slug }) {
  const row = id != null
    ? await get('SELECT * FROM sites WHERE id = ?', [id])
    : await get('SELECT * FROM sites WHERE slug = ?', [slug]);
  const site = rowToSite(row);
  if (site) site.photos = await all('SELECT * FROM photos WHERE site_id = ? ORDER BY sort, id', [site.id]);
  return site;
}

export async function saveSite(data, id) {
  const args = {
    slug: data.slug,
    type: data.type,
    region: data.region,
    lat: data.lat,
    lng: data.lng,
    coords_verified: data.coords_verified ? 1 : 0,
    published: data.published ? 1 : 0,
    content: JSON.stringify(normaliseContent(data.content)),
  };
  if (id != null) {
    await run(`UPDATE sites SET slug=:slug, type=:type, region=:region, lat=:lat, lng=:lng,
               coords_verified=:coords_verified, published=:published, content=:content,
               updated_at=datetime('now') WHERE id=:id`, { ...args, id });
    return id;
  }
  const r = await run(`INSERT INTO sites (slug, type, region, lat, lng, coords_verified, published, content)
                       VALUES (:slug, :type, :region, :lat, :lng, :coords_verified, :published, :content)`, args);
  return Number(r.lastInsertRowid);
}

export async function deleteSite(id) {
  // Explicit, since foreign-key cascades are not guaranteed on every libSQL connection.
  const [, r] = await db.batch([
    { sql: 'DELETE FROM photos WHERE site_id = ?', args: [id] },
    { sql: 'DELETE FROM sites WHERE id = ?', args: [id] },
  ], 'write');
  return r.rowsAffected > 0;
}

export async function addPhoto(siteId, { src, caption_el = '', caption_en = '', credit = '' }) {
  const r = await run(`INSERT INTO photos (site_id, src, caption_el, caption_en, credit, sort)
                       VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM photos WHERE site_id = ?))`,
  [siteId, src, caption_el, caption_en, credit, siteId]);
  return getPhoto(Number(r.lastInsertRowid));
}

export function getPhoto(id) {
  return get('SELECT * FROM photos WHERE id = ?', [id]);
}

export async function updatePhoto(id, { caption_el, caption_en, credit, sort }) {
  await run('UPDATE photos SET caption_el=?, caption_en=?, credit=?, sort=? WHERE id=?',
    [caption_el ?? '', caption_en ?? '', credit ?? '', Number(sort) || 0, id]);
  return getPhoto(id);
}

export async function deletePhoto(id) {
  return (await run('DELETE FROM photos WHERE id = ?', [id])).rowsAffected > 0;
}

// ---- regions -------------------------------------------------------------

export const regionsConfig = regionsJson;

export function childRegions(id) {
  const kids = regionsConfig.regions.filter((r) => r.parent === id).map((r) => r.id);
  return kids.flatMap((k) => [k, ...childRegions(k)]);
}

// ---- first-run seed ------------------------------------------------------

if ((await get('SELECT COUNT(*) AS n FROM sites')).n === 0) {
  try {
    for (const { photos = [], ...site } of seedSites) {
      const id = await saveSite(site);
      for (const p of photos) await addPhoto(id, p);
    }
    console.log(`Seeded ${seedSites.length} sample sites.`);
  } catch (e) {
    // Another instance may be seeding at the same time (slug UNIQUE); its data wins.
    console.warn('Seeding skipped:', e.message);
  }
}
