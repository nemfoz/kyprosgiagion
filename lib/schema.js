// Table definitions, shared by the app (lib/db.js) and scripts/sync.mjs.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sites (
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
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    src        TEXT NOT NULL,
    caption_el TEXT NOT NULL DEFAULT '',
    caption_en TEXT NOT NULL DEFAULT '',
    credit     TEXT NOT NULL DEFAULT '',
    sort       INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS photos_site ON photos(site_id, sort)',
];
