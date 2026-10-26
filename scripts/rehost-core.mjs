// Copies photos that are still loaded from other websites into our storage — shared by
// scripts/rehost-photos.mjs and scripts/migrate.mjs. Idempotent: stored photos are skipped.
import { isStored, rehost, rows } from './lib.mjs';

export async function rehostPhotos(db, { log = console.log } = {}) {
  const photos = await rows(db, `SELECT p.id, p.src, p.source_url, s.slug FROM photos p JOIN sites s ON s.id = p.site_id`);
  const external = photos.filter((p) => !isStored(p.src));
  let done = 0;
  for (const p of external) {
    try {
      const src = await rehost(p.src, p.slug);
      await db.execute({
        sql: 'UPDATE photos SET src = ?, source_url = CASE WHEN source_url = \'\' THEN ? ELSE source_url END WHERE id = ?',
        args: [src, p.src, p.id],
      });
      done++;
      log(`✓ ${p.slug}  ${src}`);
    } catch (e) {
      log(`✗ ${p.slug}  ${p.src}: ${e.message}`);
    }
  }
  return { total: photos.length, external: external.length, done };
}
