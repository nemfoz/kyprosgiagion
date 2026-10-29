// Creates/updates the database tables (safe to run repeatedly) and seeds sample content into an
// empty database. Runs on every container start. Uses DATABASE_URL if set, else data/app.db.

import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { SCHEMA, ADDED_COLUMNS } from './schema.mjs';
import fs from 'node:fs';
import { seedSites } from './seed-data.mjs';
import { importChurches, slugify } from './import-core.mjs';
import { rehostPhotos } from './rehost-core.mjs';
import { readStored, rehost, storeVariants } from './lib.mjs';

// Reviewed content files applied once per database (tracked in data_imports), in order.
const IMPORTS = [{ file: 'data/imports/imconstantias-occupied.json', published: true }];

const url = process.env.DATABASE_URL || `file:${fileURLToPath(new URL('../data/app.db', import.meta.url))}`;
const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

// Local files: write-ahead logging, so readers (the running server) aren't blocked while something writes.
if (url.startsWith('file:')) await db.execute('PRAGMA journal_mode = WAL');
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
// The Docker build only needs the tables (and the sample churches) to prerender pages: no imports or downloads.
if (process.env.MIGRATE_SCHEMA_ONLY) process.exit(0);

// ---- one-off data steps (each runs at most once per database) ----

const applied = new Set((await db.execute('SELECT name FROM data_imports')).rows.map((r) => r.name));
// Photos are stored next to the database (./uploads), so only a local database can take new ones.
const canStorePhotos = url.startsWith('file:');

for (const { file, published } of IMPORTS) {
  if (applied.has(file)) continue;
  if (!canStorePhotos) { console.log(`migrate: skipping ${file} (no photo storage configured)`); continue; }
  const entries = JSON.parse(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
  const c = await importChurches(db, entries, { published, log: (m) => console.log(`migrate:   ${m}`) });
  const summary = `${c.added} added${published ? " (published)" : " as drafts"}, ${c.exists} already present, ${c.noLocation} without location, ${c.photos} photos copied`;
  if (c.photoErrors) { console.log(`migrate: ${file}: ${summary}; ${c.photoErrors} photos failed — will retry on the next deploy`); continue; }
  await db.execute({ sql: 'INSERT INTO data_imports (name, summary) VALUES (?, ?)', args: [file, summary] });
  console.log(`migrate: imported ${file}: ${summary}`);
}

// The Metropolis churches were first imported as drafts; publish them (once).
if (!applied.has('publish:imconstantias-occupied')) {
  const entries = JSON.parse(fs.readFileSync(new URL('../data/imports/imconstantias-occupied.json', import.meta.url), 'utf8'));
  const slugs = entries.filter((e) => e.lat != null).map((e) => slugify(`${e.name_en} ${e.village_en}`));
  const r = await db.execute({ sql: `UPDATE sites SET published = 1, updated_at = datetime('now') WHERE published = 0 AND slug IN (${slugs.map(() => '?').join(',')})`, args: slugs });
  await db.execute({ sql: "INSERT INTO data_imports (name, summary) VALUES ('publish:imconstantias-occupied', ?)", args: [`published ${r.rowsAffected}`] });
  console.log(`migrate: published ${r.rowsAffected} Metropolis churches`);
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

// The sees of the Church of Cyprus (data/imports/metropolises.json, from scripts/fetch-metropolises.mjs).
// Logos are copied into our storage; existing rows (edited in the admin) are never overwritten.
if (!applied.has('import:metropolises') && canStorePhotos) {
  const sees = JSON.parse(fs.readFileSync(new URL('../data/imports/metropolises.json', import.meta.url), 'utf8'));
  let added = 0, logos = 0;
  for (const m of sees) {
    let logo = '';
    if (m.logo) {
      try { logo = await rehost(m.logo, `metropolis-${m.slug}`); logos++ } catch (e) { console.log(`migrate:   logo ${m.slug}: ${e.message}`) }
    }
    const r = await db.execute({
      sql: `INSERT OR IGNORE INTO metropolises (slug, sort, website, feed_url, logo, content) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [m.slug, m.sort, m.website, m.feed, logo, JSON.stringify(m.content)],
    });
    added += r.rowsAffected;
  }
  await db.execute({ sql: "INSERT INTO data_imports (name, summary) VALUES ('import:metropolises', ?)", args: [`${added} added, ${logos} logos`] });
  console.log(`migrate: added ${added} metropolises (${logos} logos copied)`);
}

// Which see each church belongs to (once): the Metropolis's own occupied-parish list → Constantia–Ammochostos;
// the Karpasia peninsula (Trikomo included) → the Bishopric of Karpasia. Others are left for an admin to set.
if (!applied.has('assign:metropolises')) {
  const id = async (slug) => (await db.execute({ sql: 'SELECT id FROM metropolises WHERE slug = ?', args: [slug] })).rows[0]?.id;
  const [constantia, karpasia] = [await id('constantia-ammochostos'), await id('karpasia')];
  if (constantia && karpasia) {
    const a = await db.execute({ sql: `UPDATE sites SET metropolis_id = ? WHERE metropolis_id IS NULL AND json_extract(content, '$.el.sources') LIKE '%imconstantias%'`, args: [constantia] });
    const b = await db.execute({ sql: `UPDATE sites SET metropolis_id = ? WHERE metropolis_id IS NULL AND region = 'karpasia'`, args: [karpasia] });
    await db.execute({ sql: "INSERT INTO data_imports (name, summary) VALUES ('assign:metropolises', ?)", args: [`${a.rowsAffected} Constantia, ${b.rowsAffected} Karpasia`] });
    console.log(`migrate: assigned ${a.rowsAffected} churches to Constantia–Ammochostos, ${b.rowsAffected} to Karpasia`);
  }
}

// No hotlinks: copy any photo still loaded from another website into our storage (skips stored ones).
if (canStorePhotos) {
  const r = await rehostPhotos(db, { log: (m) => console.log(`migrate:   ${m}`) });
  if (r.external) console.log(`migrate: copied ${r.done} of ${r.external} hotlinked photos into storage`);
}


// Smaller copies of the photos stored before uploads made them (once; retried while any fail).
if (canStorePhotos && !applied.has('variants:photos')) {
  const photos = (await db.execute('SELECT src FROM photos')).rows.map((r) => String(r.src)).filter((src) => /^\/(uploads|media)\//.test(src));
  let done = 0, failed = 0;
  for (const src of photos) {
    try { await storeVariants(src, await readStored(src)); done++ } catch (e) { failed++; console.log(`migrate:   copies ${src}: ${e.message}`) }
  }
  if (!failed) await db.execute({ sql: "INSERT INTO data_imports (name, summary) VALUES ('variants:photos', ?)", args: [`${done} photos`] });
  console.log(`migrate: made smaller copies of ${done} photos${failed ? `, ${failed} failed — will retry on the next deploy` : ''}`);
}

// Visits and profile settings of deleted accounts (foreign keys aren't enforced).
await db.batch([
  'DELETE FROM visits WHERE user_id NOT IN (SELECT id FROM user) OR site_id NOT IN (SELECT id FROM sites)',
  'DELETE FROM profiles WHERE user_id NOT IN (SELECT id FROM user)',
], 'write');
