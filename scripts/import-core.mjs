// Imports churches from a reviewed import file (see scripts/import.mjs) — shared by the CLI and scripts/migrate.mjs.
import { rehost, rows } from './lib.mjs';

const SOURCE_EL = 'Ιερά Μητρόπολη Κωνσταντίας-Αμμοχώστου';
const SOURCE_EN = 'Holy Metropolis of Constantia–Ammochostos';
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

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

/** Adds the entries as unpublished drafts (existing slugs are kept) and copies their photos. Idempotent. */
export async function importChurches(db, entries, { withPhotos = true, log = console.log } = {}) {
  const counts = { added: 0, exists: 0, noLocation: 0, photos: 0, photoErrors: 0 };

  for (const e of entries) {
    const slug = slugify(`${e.name_en} ${e.village_en}`);
    if (e.lat == null || e.lng == null) {
      log(`– no location, skipped: ${e.title_el}`);
      counts.noLocation++;
      continue;
    }
    let [site] = await rows(db, 'SELECT id FROM sites WHERE slug = ?', [slug]);
    const isNew = !site;
    if (site) {
      counts.exists++;
    } else {
      const r = await db.execute({
        sql: `INSERT INTO sites (slug, type, region, lat, lng, coords_verified, published, content) VALUES (?, 'church', ?, ?, ?, ?, 0, ?)`,
        args: [slug, e.region || 'famagusta', e.lat, e.lng, e.coords?.startsWith('exact') ? 1 : 0, JSON.stringify(content(e))],
      });
      site = { id: Number(r.lastInsertRowid) };
      counts.added++;
    }

    let note = '';
    if (withPhotos && e.use_image && e.image) {
      const [has] = await rows(db, 'SELECT id FROM photos WHERE site_id = ? AND source_url = ?', [site.id, e.source]);
      if (!has) {
        try {
          const src = await rehost(e.image, slug);
          await db.execute({
            sql: 'INSERT INTO photos (site_id, src, credit, source_url, sort) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM photos WHERE site_id = ?))',
            args: [site.id, src, SOURCE_EL, e.source, site.id],
          });
          counts.photos++;
          note = ' + photo';
        } catch (err) {
          note = ` (photo failed: ${err.message})`;
        counts.photoErrors++;
        }
      }
    }
    log(`${isNew ? '+' : '='} ${slug}${note}${e.coords?.startsWith('exact') ? '' : '  [approximate location]'}`);
  }
  return counts;
}
