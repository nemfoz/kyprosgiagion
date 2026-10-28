// Moves the production data into this server's database and ./uploads (once, before the first start):
//
//   node scripts/import-dump.mjs <dump.json> <old-site-url>
//
// dump.json comes from the old deployment's /api/export (app/api/export/route.ts). Every photo listed there is
// downloaded through the old site's /media route into ./uploads, and /media/photos/… addresses in the data
// become /uploads/…. On a database that already has churches it only fetches missing photos (a safe re-run).
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA, ADDED_COLUMNS } from './schema.mjs';
import { openDb, ROOT } from './lib.mjs';

const [file, oldSite] = process.argv.slice(2);
if (!file || !oldSite) {
  console.error('usage: node scripts/import-dump.mjs <dump.json> <old-site-url>');
  process.exit(1);
}
const dump = JSON.parse(fs.readFileSync(file, 'utf8'));
const { url, db } = openDb();

await db.batch(SCHEMA, 'write');
for (const [table, column, definition] of ADDED_COLUMNS) {
  const cols = (await db.execute(`PRAGMA table_info(${table})`)).rows.map((r) => r.name);
  if (!cols.includes(column)) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
const existing = Number((await db.execute('SELECT COUNT(*) AS n FROM sites')).rows[0].n);
if (existing > 0) console.log(`import: ${url} already has ${existing} churches — not importing data, only missing photos.`);

// /media/photos/x.jpg (private Blob, served by the old site) → /uploads/x.jpg (this server's disk).
const local = (v) => (typeof v === 'string' ? v.replaceAll('/media/photos/', '/uploads/') : v);

// Parents before children, so the order is valid even with foreign keys on.
const ORDER = ['user', 'account', 'metropolises', 'sites', 'photos', 'videos', 'metropolis_news', 'submissions',
  'translation_suggestions', 'settings', 'data_imports', 'visits', 'profiles'];
const tables = existing > 0 ? [] : Object.keys(dump.tables).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
for (const table of tables) {
  const known = new Set((await db.execute(`PRAGMA table_info("${table}")`)).rows.map((r) => r.name));
  if (!known.size) { console.log(`import: skipping unknown table ${table}`); continue; }
  const rows = dump.tables[table];
  const stmts = rows.map((row) => {
    const cols = Object.keys(row).filter((c) => known.has(c));
    return { sql: `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, args: cols.map((c) => local(row[c])) };
  });
  for (let i = 0; i < stmts.length; i += 200) await db.batch(stmts.slice(i, i + 200), 'write');
  console.log(`import: ${table}: ${rows.length} rows`);
}

const dir = path.join(ROOT, 'uploads');
fs.mkdirSync(dir, { recursive: true });
let done = 0, failed = 0;
for (const pathname of dump.blobs.filter((p) => p.startsWith('photos/'))) {
  const target = path.join(dir, path.basename(pathname));
  if (fs.existsSync(target)) { done++; continue; }
  try {
    const res = await fetch(`${oldSite.replace(/\/$/, '')}/media/${pathname}`, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(String(res.status));
    fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    done++;
  } catch (e) {
    failed++;
    console.log(`import:   ${pathname}: ${e.message}`);
  }
}
console.log(`import: ${done} photos in ${dir}${failed ? `, ${failed} failed (run again to retry)` : ''}`);
