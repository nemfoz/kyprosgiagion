// Copies every photo that is still loaded from another website into our own storage
// (./uploads) and keeps the original address as the visible source link.
// Also runs automatically on every deploy (scripts/migrate.mjs).
//
//   npm run rehost-photos      # local database

import { openDb } from './lib.mjs';
import { rehostPhotos } from './rehost-core.mjs';

const { db, url } = openDb();
const r = await rehostPhotos(db);
console.log(`${r.total} photos, ${r.external} were hotlinked, copied ${r.done} (${url.startsWith('file:') ? 'local' : 'production'} database)`);
