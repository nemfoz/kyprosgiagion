// Adds churches from a reviewed import file (e.g. data/imports/imconstantias-occupied.json) as
// UNPUBLISHED drafts, with their photos copied into our storage. Churches whose slug already exists
// only get any missing photos. Safe to run more than once.
//
//   node scripts/import.mjs data/imports/imconstantias-occupied.json                                    # local
//   node --env-file=.env.production.local scripts/import.mjs data/imports/imconstantias-occupied.json   # production
//   --no-photos   skip photos

import fs from 'node:fs';
import { openDb } from './lib.mjs';
import { importChurches } from './import-core.mjs';

const file = process.argv.find((a) => a.endsWith('.json'));
const withPhotos = !process.argv.includes('--no-photos');
if (!file) {
  console.error('Usage: node scripts/import.mjs <file.json> [--no-photos]');
  process.exit(1);
}

const { db, url } = openDb();
console.log(`Importing into the ${url.startsWith('file:') ? 'local' : 'production'} database`);
const counts = await importChurches(db, JSON.parse(fs.readFileSync(file, 'utf8')), { withPhotos });
console.log(`\n${counts.added} added as drafts, ${counts.exists} already present, ${counts.noLocation} without location, ${counts.photos} photos copied.`);
