// Copies every photo that is still loaded from another website into our own storage
// (Vercel Blob in production, ./uploads locally) and keeps the original address as the visible source link.
//
//   npm run rehost-photos                                              # local database
//   node --env-file=.env.production.local scripts/rehost-photos.mjs    # production

import { isStored, openDb, rehost, rows } from './lib.mjs';

const { db, url } = openDb();
const photos = await rows(db, `SELECT p.id, p.src, p.source_url, s.slug FROM photos p JOIN sites s ON s.id = p.site_id`);
const external = photos.filter((p) => !isStored(p.src));
console.log(`${photos.length} photos, ${external.length} hotlinked (${url.startsWith('file:') ? 'local' : 'production'} database)`);

let done = 0;
for (const p of external) {
  try {
    const src = await rehost(p.src, p.slug);
    await db.execute({
      sql: 'UPDATE photos SET src = ?, source_url = CASE WHEN source_url = \'\' THEN ? ELSE source_url END WHERE id = ?',
      args: [src, p.src, p.id],
    });
    done++;
    console.log(`✓ ${p.slug}  ${src}`);
  } catch (e) {
    console.log(`✗ ${p.slug}  ${p.src}: ${e.message}`);
  }
}
console.log(`Copied ${done} of ${external.length}.`);
