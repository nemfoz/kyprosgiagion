import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { seedSites } from './seed.js';

export const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL DEFAULT 'church',
    region          TEXT NOT NULL DEFAULT 'famagusta',
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    coords_verified INTEGER NOT NULL DEFAULT 0,
    published       INTEGER NOT NULL DEFAULT 0,
    content         TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    src        TEXT NOT NULL,
    caption_el TEXT NOT NULL DEFAULT '',
    caption_en TEXT NOT NULL DEFAULT '',
    credit     TEXT NOT NULL DEFAULT '',
    sort       INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS photos_site ON photos(site_id, sort);
`);

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

export function listSites({ publishedOnly = true, region } = {}) {
  const where = [];
  const params = {};
  if (publishedOnly) where.push('published = 1');
  if (region) {
    // A region also contains the sites of its sub-regions (e.g. famagusta ⊃ karpasia).
    where.push('(region = :region OR region IN (SELECT value FROM json_each(:children)))');
    params.region = region;
    params.children = JSON.stringify(childRegions(region));
  }
  const sql = `SELECT s.*, (SELECT src FROM photos p WHERE p.site_id = s.id ORDER BY sort, id LIMIT 1) AS cover
               FROM sites s ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.id`;
  return db.prepare(sql).all(params).map(rowToSite);
}

export function getSite({ id, slug }) {
  const row = id != null
    ? db.prepare('SELECT * FROM sites WHERE id = ?').get(id)
    : db.prepare('SELECT * FROM sites WHERE slug = ?').get(slug);
  const site = rowToSite(row);
  if (site) site.photos = db.prepare('SELECT * FROM photos WHERE site_id = ? ORDER BY sort, id').all(site.id);
  return site;
}

export function saveSite(data, id) {
  const params = {
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
    db.prepare(`UPDATE sites SET slug=:slug, type=:type, region=:region, lat=:lat, lng=:lng,
                coords_verified=:coords_verified, published=:published, content=:content,
                updated_at=datetime('now') WHERE id=:id`).run({ ...params, id });
    return id;
  }
  const r = db.prepare(`INSERT INTO sites (slug, type, region, lat, lng, coords_verified, published, content)
                        VALUES (:slug, :type, :region, :lat, :lng, :coords_verified, :published, :content)`).run(params);
  return Number(r.lastInsertRowid);
}

export function deleteSite(id) {
  return db.prepare('DELETE FROM sites WHERE id = ?').run(id).changes > 0;
}

export function addPhoto(siteId, { src, caption_el = '', caption_en = '', credit = '' }) {
  const { next } = db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM photos WHERE site_id = ?').get(siteId);
  const r = db.prepare('INSERT INTO photos (site_id, src, caption_el, caption_en, credit, sort) VALUES (?, ?, ?, ?, ?, ?)')
    .run(siteId, src, caption_el, caption_en, credit, next);
  return db.prepare('SELECT * FROM photos WHERE id = ?').get(Number(r.lastInsertRowid));
}

export function getPhoto(id) {
  return db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
}

export function updatePhoto(id, { caption_el, caption_en, credit, sort }) {
  db.prepare('UPDATE photos SET caption_el=?, caption_en=?, credit=?, sort=? WHERE id=?')
    .run(caption_el ?? '', caption_en ?? '', credit ?? '', Number(sort) || 0, id);
  return getPhoto(id);
}

export function deletePhoto(id) {
  return db.prepare('DELETE FROM photos WHERE id = ?').run(id).changes > 0;
}

// ---- regions -------------------------------------------------------------

export const regionsConfig = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'regions.json'), 'utf8'));

export function childRegions(id) {
  const kids = regionsConfig.regions.filter((r) => r.parent === id).map((r) => r.id);
  return kids.flatMap((k) => [k, ...childRegions(k)]);
}

// ---- first-run seed ------------------------------------------------------

if (db.prepare('SELECT COUNT(*) AS n FROM sites').get().n === 0) {
  for (const { photos = [], ...site } of seedSites) {
    const id = saveSite(site);
    for (const p of photos) addPhoto(id, p);
  }
  console.log(`Seeded ${seedSites.length} sample sites.`);
}
