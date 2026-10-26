// Sync churches between the local database (data/app.db) and production (Turso + Vercel Blob).
// Needs the production variables in .env.production.local (see .env.example).
//
//   npm run sync:pull                 production → local (local copy is backed up first)
//   npm run sync:push                 local → production, DRY RUN: shows what would change
//   npm run sync:push -- --apply      local → production, for real
//   npm run sync:push -- --apply --force   also overwrite churches edited more recently in production
//
// Push matches churches by slug, never deletes anything in production, and uploads local photos to Blob.
// Only churches and photos are synced — user accounts and proposals stay where they are.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { del } from '@vercel/blob';
import { uploadLocal } from './lib.mjs';
import { SCHEMA, ADDED_COLUMNS } from './schema.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LOCAL_FILE = path.join(ROOT, 'data', 'app.db');
const [command] = process.argv.slice(2);
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

const remoteUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
if (!remoteUrl || path.resolve(remoteUrl.replace(/^file:/, '')) === LOCAL_FILE) {
  console.error('Production database not configured. Run with: node --env-file=.env.production.local scripts/sync.mjs …');
  process.exit(1);
}
const remote = createClient({ url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN });
const local = createClient({ url: `file:${LOCAL_FILE}` });

async function all(db, sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}

async function snapshot(db) {
  await db.batch(SCHEMA, 'write');
  for (const [table, column, definition] of ADDED_COLUMNS) {
    const cols = (await db.execute(`PRAGMA table_info(${table})`)).rows.map((r) => r.name);
    if (!cols.includes(column)) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  const sites = await all(db, 'SELECT * FROM sites ORDER BY id');
  const photos = await all(db, 'SELECT * FROM photos ORDER BY site_id, sort, id');
  for (const s of sites) s.photos = photos.filter((p) => p.site_id === s.id);
  return sites;
}

const SITE_COLS = ['slug', 'type', 'region', 'lat', 'lng', 'coords_verified', 'published', 'content', 'created_at', 'updated_at'];
const PHOTO_COLS = ['src', 'caption_el', 'caption_en', 'credit', 'source_url', 'sort'];
const signature = (s) => JSON.stringify([
  SITE_COLS.filter((c) => !c.endsWith('_at')).map((c) => s[c]),
  s.photos.map((p) => PHOTO_COLS.map((c) => p[c])),
]);
const label = (s) => `${s.slug} (${JSON.parse(s.content).el?.name || ''})`;

// ---- pull ------------------------------------------------------------------

async function pull() {
  const sites = await snapshot(remote);
  if (fs.existsSync(LOCAL_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const ext of ['', '-wal', '-shm']) {
      if (fs.existsSync(LOCAL_FILE + ext)) fs.copyFileSync(LOCAL_FILE + ext, `${LOCAL_FILE}.backup-${stamp}${ext}`);
    }
    console.log(`Local database backed up to data/app.db.backup-${stamp}`);
  }
  await snapshot(local); // ensures tables exist
  const stmts = [{ sql: 'DELETE FROM photos' }, { sql: 'DELETE FROM sites' }];
  for (const s of sites) {
    stmts.push({
      sql: `INSERT INTO sites (id, ${SITE_COLS.join(', ')}) VALUES (?${', ?'.repeat(SITE_COLS.length)})`,
      args: [s.id, ...SITE_COLS.map((c) => s[c])],
    });
    for (const p of s.photos) {
      stmts.push({
        sql: `INSERT INTO photos (id, site_id, ${PHOTO_COLS.join(', ')}) VALUES (?, ?${', ?'.repeat(PHOTO_COLS.length)})`,
        args: [p.id, s.id, ...PHOTO_COLS.map((c) => p[c])],
      });
    }
  }
  await local.batch(stmts, 'write');
  console.log(`Pulled ${sites.length} churches and ${sites.reduce((n, s) => n + s.photos.length, 0)} photos from production.`);
}

// ---- push ------------------------------------------------------------------

async function push() {
  const [mine, theirs] = await Promise.all([snapshot(local), snapshot(remote)]);
  const bySlug = new Map(theirs.map((s) => [s.slug, s]));
  const plan = { add: [], update: [], conflict: [], same: 0 };

  for (const s of mine) {
    const r = bySlug.get(s.slug);
    if (!r) plan.add.push(s);
    else if (signature(s) === signature(r)) plan.same++;
    else if (r.updated_at > s.updated_at && !FORCE) plan.conflict.push(s);
    else plan.update.push({ s, r });
  }
  const onlyRemote = theirs.filter((r) => !mine.some((s) => s.slug === r.slug));

  console.log(`${plan.same} unchanged`);
  plan.add.forEach((s) => console.log(`+ add      ${label(s)}`));
  plan.update.forEach(({ s }) => console.log(`~ update   ${label(s)}`));
  plan.conflict.forEach((s) => console.log(`! skipped  ${label(s)} – edited more recently in production (use --force to overwrite)`));
  onlyRemote.forEach((r) => console.log(`  only in production (left as is): ${label(r)}`));

  if (!APPLY) {
    console.log('\nDry run – nothing changed. Add --apply to push.');
    return;
  }

  for (const s of [...plan.add, ...plan.update.map((u) => u.s)]) {
    const existing = bySlug.get(s.slug);
    // Upload local photo files first and remember their new Blob URLs locally too.
    for (const p of s.photos) {
      const url = await uploadLocal(p.src);
      if (url !== p.src) {
        await local.execute({ sql: 'UPDATE photos SET src = ? WHERE id = ?', args: [url, p.id] });
        p.src = url;
      }
    }
    const stmts = [];
    let siteId;
    if (existing) {
      siteId = existing.id;
      stmts.push({
        sql: `UPDATE sites SET ${SITE_COLS.filter((c) => c !== 'slug').map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        args: [...SITE_COLS.filter((c) => c !== 'slug').map((c) => s[c]), siteId],
      });
      stmts.push({ sql: 'DELETE FROM photos WHERE site_id = ?', args: [siteId] });
    } else {
      const r = await remote.execute({
        sql: `INSERT INTO sites (${SITE_COLS.join(', ')}) VALUES (?${', ?'.repeat(SITE_COLS.length - 1)})`,
        args: SITE_COLS.map((c) => s[c]),
      });
      siteId = Number(r.lastInsertRowid);
    }
    for (const p of s.photos) {
      stmts.push({
        sql: `INSERT INTO photos (site_id, ${PHOTO_COLS.join(', ')}) VALUES (?${', ?'.repeat(PHOTO_COLS.length)})`,
        args: [siteId, ...PHOTO_COLS.map((c) => p[c])],
      });
    }
    await remote.batch(stmts, 'write');
    // Remove Blob files that the production entry no longer uses.
    const keep = new Set(s.photos.map((p) => p.src));
    for (const old of existing?.photos ?? []) {
      if (!keep.has(old.src) && /\.blob\.vercel-storage\.com\//.test(old.src)) await del(old.src).catch(() => {});
    }
    console.log(`✓ ${existing ? 'updated' : 'added'} ${s.slug}`);
  }
  console.log('Done.');
}

if (command === 'pull') await pull();
else if (command === 'push') await push();
else {
  console.error('Usage: node --env-file=.env.production.local scripts/sync.mjs pull | push [--apply] [--force]');
  process.exit(1);
}
