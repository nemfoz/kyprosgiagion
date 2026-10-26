// Creates/updates the database tables (safe to run repeatedly) and seeds sample content into an
// empty database. Runs before every build. Uses TURSO_DATABASE_URL if set, else data/app.db.

import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { SCHEMA, ADDED_COLUMNS } from './schema.mjs';
import fs from 'node:fs';
import { seedSites } from './seed-data.mjs';
import { importChurches } from './import-core.mjs';
import { rehostPhotos } from './rehost-core.mjs';
import { hasBlobStorage } from './lib.mjs';

// Reviewed content files applied once per database (tracked in data_imports), in order.
const IMPORTS = ['data/imports/imconstantias-occupied.json'];

if (process.env.VERCEL && !(process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL)) {
  console.error('migrate: TURSO_DATABASE_URL is not set for this Vercel environment (Settings → Environment Variables).');
  process.exit(1);
}
const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  || `file:${fileURLToPath(new URL('../data/app.db', import.meta.url))}`;
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN });

// TEMP DIAGNOSTIC
{ const u = new URL(url.replace(/^libsql:/, 'https:')); const t = (await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).rows.map((r) => r.name);
  console.log(`diag: protocol=${url.split(':')[0]} host=${u.host} tables-before=[${t.join(',')}] sites=${t.includes('sites') ? (await db.execute('SELECT COUNT(*) n FROM sites')).rows[0].n : '-'}`); }
await db.batch(SCHEMA, 'write');

for (const [table, column, definition] of ADDED_COLUMNS) {
  const cols = (await db.execute(`PRAGMA table_info(${table})`)).rows.map((r) => r.name);
  if (!cols.includes(column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`migrate: added ${table}.${column}`);
  }
}

// One-off: the sample Trikomo photos were hotlinked from Blogger; link their credit to the blog post.
const BLOG = 'https://biodiversitycyprus.blogspot.com/2016/09/churche-of-panagia-theotokou-in-turkish.html';
await db.execute({
  sql: `UPDATE photos SET source_url = ? WHERE (source_url = '' OR source_url LIKE '%blogger.googleusercontent.com%')
        AND site_id = (SELECT id FROM sites WHERE slug = 'panagia-theotokos-trikomo')`,
  args: [BLOG],
});

const { rows } = await db.execute('SELECT COUNT(*) AS n FROM sites');
if (Number(rows[0].n) === 0) {
  for (const { photos = [], content, ...s } of seedSites) {
    const r = await db.execute({
      sql: `INSERT INTO sites (slug, type, region, lat, lng, coords_verified, published, content)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.slug, s.type, s.region, s.lat, s.lng, s.coords_verified ? 1 : 0, s.published ? 1 : 0, JSON.stringify(content)],
    });
    for (const [i, p] of photos.entries()) {
      await db.execute({
        sql: 'INSERT INTO photos (site_id, src, credit, source_url, sort) VALUES (?, ?, ?, ?, ?)',
        args: [Number(r.lastInsertRowid), p.src, p.credit ?? '', p.source_url ?? '', i],
      });
    }
  }
  console.log(`migrate: seeded ${seedSites.length} sample sites (run "npm run rehost-photos" to copy their photos into storage)`);
}

console.log(`migrate: database ready (${url.startsWith('file:') ? 'local file' : 'remote'})`);

// ---- one-off data steps (each runs at most once per database) ----

const applied = new Set((await db.execute('SELECT name FROM data_imports')).rows.map((r) => r.name));
const canStorePhotos = url.startsWith('file:') || hasBlobStorage();

for (const file of IMPORTS) {
  if (applied.has(file)) continue;
  if (!canStorePhotos) { console.log(`migrate: skipping ${file} (no photo storage configured)`); continue; }
  const entries = JSON.parse(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
  const c = await importChurches(db, entries, { log: (m) => console.log(`migrate:   ${m}`) });
  const summary = `${c.added} added as drafts, ${c.exists} already present, ${c.noLocation} without location, ${c.photos} photos copied`;
  if (c.photoErrors) { console.log(`migrate: ${file}: ${summary}; ${c.photoErrors} photos failed — will retry on the next deploy`); continue; }
  await db.execute({ sql: 'INSERT INTO data_imports (name, summary) VALUES (?, ?)', args: [file, summary] });
  console.log(`migrate: imported ${file}: ${summary}`);
}

// Test accounts created while checking the first live deploy (never confirmed, cannot log in).
if (!applied.has('cleanup:probe-accounts')) {
  const probes = ['probe-test@example.org', 'probe-two@example.org', 'probe-three@example.org'];
  const marks = probes.map(() => '?').join(',');
  await db.batch([
    { sql: `DELETE FROM session WHERE user_id IN (SELECT id FROM user WHERE email IN (${marks}) AND email_verified = 0)`, args: probes },
    { sql: `DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email IN (${marks}) AND email_verified = 0)`, args: probes },
    { sql: `DELETE FROM user WHERE email IN (${marks}) AND email_verified = 0`, args: probes },
    { sql: "INSERT INTO data_imports (name, summary) VALUES ('cleanup:probe-accounts', 'removed unconfirmed probe accounts')", args: [] },
  ], 'write');
  console.log('migrate: removed test accounts');
}

// No hotlinks: copy any photo still loaded from another website into our storage (skips stored ones).
if (canStorePhotos) {
  const r = await rehostPhotos(db, { log: (m) => console.log(`migrate:   ${m}`) });
  if (r.external) console.log(`migrate: copied ${r.done} of ${r.external} hotlinked photos into storage`);
}

