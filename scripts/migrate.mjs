// Creates/updates the database tables (safe to run repeatedly) and seeds sample content into an
// empty database. Runs before every build. Uses TURSO_DATABASE_URL if set, else data/app.db.

import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { SCHEMA, ADDED_COLUMNS } from './schema.mjs';
import { seedSites } from './seed-data.mjs';

if (process.env.VERCEL && !(process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL)) {
  console.error('migrate: TURSO_DATABASE_URL is not set for this Vercel environment (Settings → Environment Variables).');
  process.exit(1);
}
const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  || `file:${fileURLToPath(new URL('../data/app.db', import.meta.url))}`;
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN });

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
