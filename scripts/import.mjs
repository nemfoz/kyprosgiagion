// Adds churches from a reviewed import file (e.g. data/imports/imconstantias-occupied.json)
// as UNPUBLISHED drafts. Existing slugs are skipped, so it is safe to run more than once.
//
//   node scripts/import.mjs data/imports/imconstantias-occupied.json              # local database
//   node --env-file=.env.production.local scripts/import.mjs <file>               # production (Turso)
//   add --with-photos to also link each church's photo from the source website
//     (only once the Metropolis has given permission to use its photos).

import fs from 'node:fs';
import { getSite, saveSite, addPhoto } from '../lib/db.js';
import { slugify } from '../lib/slug.js';

const file = process.argv.find((a) => a.endsWith('.json'));
const withPhotos = process.argv.includes('--with-photos');
if (!file) {
  console.error('Usage: node scripts/import.mjs <file.json> [--with-photos]');
  process.exit(1);
}

const SOURCE_EL = 'Ιερά Μητρόπολη Κωνσταντίας-Αμμοχώστου';
const SOURCE_EN = 'Holy Metropolis of Constantia–Ammochostos';

function content(e) {
  const inTown = e.village_en === 'Famagusta';
  return {
    el: {
      name: e.name_el,
      location: inTown ? 'Αμμόχωστος' : `${e.village_el}, επαρχία Αμμοχώστου`,
      summary: inTown
        ? `${e.name_el} στην κατεχόμενη πόλη της Αμμοχώστου.`
        : `${e.name_el} στην κατεχόμενη κοινότητα ${e.village_el} της επαρχίας Αμμοχώστου.`,
      body: '*Το ιστορικό του ναού θα συμπληρωθεί.*',
      facts: `Κατάσταση περιοχής: Στο κατεχόμενο τμήμα της Κυπριακής Δημοκρατίας\nΜητρόπολη: ${SOURCE_EL}`,
      sources: `[${SOURCE_EL} – ${e.title_el}](${e.source})`,
    },
    en: {
      name: e.name_en,
      location: inTown ? 'Famagusta' : `${e.village_en}, Famagusta District`,
      summary: inTown
        ? `${e.name_en} in the occupied town of Famagusta.`
        : `${e.name_en} in the occupied community of ${e.village_en}, Famagusta District.`,
      body: '*The history of the church will be added.*',
      facts: `Status of area: Occupied part of the Republic of Cyprus\nMetropolis: ${SOURCE_EN}`,
      sources: `[${SOURCE_EN} – ${e.title_el}](${e.source})`,
    },
  };
}

const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
const counts = { added: 0, exists: 0, noLocation: 0 };

for (const e of entries) {
  const slug = slugify(`${e.name_en} ${e.village_en}`);
  if (e.lat == null || e.lng == null) {
    console.log(`– no location, skipped: ${e.title_el}`);
    counts.noLocation++;
    continue;
  }
  if (await getSite({ slug })) {
    console.log(`= already exists:         ${slug}`);
    counts.exists++;
    continue;
  }
  const id = await saveSite({
    slug, type: 'church', region: e.region || 'famagusta',
    lat: e.lat, lng: e.lng,
    coords_verified: e.coords?.startsWith('exact'),
    published: false,
    content: content(e),
  });
  if (withPhotos && e.use_image && e.image) await addPhoto(id, { src: e.image, credit: SOURCE_EL });
  console.log(`+ added (draft):          ${slug}${e.coords?.startsWith('exact') ? '' : '  [approximate location]'}`);
  counts.added++;
}

console.log(`\n${counts.added} added as drafts, ${counts.exists} already present, ${counts.noLocation} without location.`);
