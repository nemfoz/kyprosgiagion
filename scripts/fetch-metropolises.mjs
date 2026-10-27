// Builds data/imports/metropolises.json: the sees of the Church of Cyprus with their website, news feed,
// logo and the history text from their own websites (cut between the markers below, with a source link).
// Usage: node scripts/fetch-metropolises.mjs — review the output before committing; scripts/migrate.mjs applies it once.
//
// Sources checked 2026-10-27. Not fetched: churchofcyprus.org.cy (behind a Cloudflare challenge),
// imkitiou.org (robots.txt disallows crawlers), metropoliskyrenia.org (no history page), Karpasia (no website).

import fs from 'node:fs';

const OUT = new URL('../data/imports/metropolises.json', import.meta.url);
const UA = { 'User-Agent': 'kyprosagiongi-importer/0.1 (heritage map; contact via site admin)' };

// kind: archdiocese | metropolis | bishopric. history: { url, from, until } — text from the paragraph containing
// `from` up to (not including) the one containing `until`.
// iml.cy pages end the article where the sidebar's date line ("Οκτωβρίου 2026") begins.
const SIDEBAR_DATE = '<sidebar date>';

const SEES = [
  { slug: 'archbishopric-cyprus', kind: 'archdiocese', name: { el: 'Ιερά Αρχιεπισκοπή Κύπρου', en: 'Archdiocese of Cyprus' }, seat: { el: 'Λευκωσία', en: 'Nicosia' },
    website: 'https://churchofcyprus.org.cy/', feed: '', logo: '' }, // the site serves a 1×1 placeholder to scripts
  { slug: 'paphos', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Πάφου', en: 'Metropolis of Paphos' }, seat: { el: 'Πάφος', en: 'Paphos' },
    website: 'https://impaphou.org/', feed: 'https://impaphou.org/feed/', logo: 'https://impaphou.org/wp-content/uploads/2024/01/ΙΜΠάφου-λογότυπο-κυκλικό-μεγάλο.png',
    history: { url: 'https://impaphou.org/mitropoli/istoriko-mitropoleos-pafou/', from: 'Οὗ­τοι', until: 'Η πρώτη Μητρόπολη κατά τα βυζαντινά χρόνια' } },
  { slug: 'kition', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Κιτίου', en: 'Metropolis of Kition' }, seat: { el: 'Λάρνακα', en: 'Larnaca' },
    website: 'https://imkitiou.org/', feed: '', logo: '' },
  { slug: 'kyrenia', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Κυρηνείας', en: 'Metropolis of Kyrenia' }, seat: { el: 'Κερύνεια (γραφεία προσωρινά στη Λευκωσία)', en: 'Kyrenia (offices temporarily in Nicosia)' },
    website: 'https://www.metropoliskyrenia.org/', feed: '', logo: '' },
  { slug: 'limassol', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Λεμεσού', en: 'Metropolis of Limassol' }, seat: { el: 'Λεμεσός', en: 'Limassol' },
    website: 'https://iml.cy/', feed: 'https://iml.cy/feed/?post_type=article', logo: '',
    history: { url: 'https://iml.cy/article/istoriko-ieras-mitropoleos-amathoyntos/', from: 'Η σημερινή πόλη της Λεμεσού', until: SIDEBAR_DATE } },
  { slug: 'morphou', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Μόρφου', en: 'Metropolis of Morphou' }, seat: { el: 'Μόρφου (προσωρινή έδρα Ευρύχου)', en: 'Morphou (temporary seat Evrychou)' },
    website: 'https://immorfou.org.cy/', feed: 'https://immorfou.org.cy/feed/', logo: 'https://immorfou.org.cy/wp-content/uploads/2021/07/final_logo-15.png',
    history: { url: 'https://immorfou.org.cy/επισκοπή-σόλων/', from: 'Η Επισκοπή Σόλων, σύμφωνα', until: 'FacebookShare' } },
  { slug: 'constantia-ammochostos', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Κωνσταντίας και Αμμοχώστου', en: 'Metropolis of Constantia and Ammochostos' }, seat: { el: 'Αμμόχωστος (προσωρινή έδρα Παραλίμνι)', en: 'Famagusta (temporary seat Paralimni)' },
    website: 'https://imconstantias.org.cy/', feed: 'https://imconstantias.org.cy/feed/', logo: 'https://imconstantias.org.cy/wp-content/uploads/2025/07/logo_retina_imconstantias.png',
    history: { url: 'https://imconstantias.org.cy/istoriko/', from: 'Ιερά Σύνοδος της Εκκλησίας της Κύπρου αποφάσισε', until: 'Τα Γραφεία είναι ανοικτά' } },
  { slug: 'kykkos-tillyria', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Κύκκου και Τηλλυρίας', en: 'Metropolis of Kykkos and Tillyria' }, seat: { el: 'Ιερά Μονή Κύκκου', en: 'Kykkos Monastery' },
    website: 'https://imkykkou.org.cy/', feed: 'https://imkykkou.org.cy/feed', logo: '' },
  { slug: 'tamassos-oreini', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Ταμασού και Ορεινής', en: 'Metropolis of Tamassos and Oreini' }, seat: { el: 'Επισκοπειό', en: 'Episkopeio' },
    website: 'https://www.imtamasou.org.cy/', feed: 'https://www.imtamasou.org.cy/feed/', logo: 'https://www.imtamasou.org.cy/wp-content/themes/imtamasou_v13/images/logo-332889960.png',
    history: { url: 'https://www.imtamasou.org.cy/tamasos-2/episkopi_tamasou/', from: 'Η μητρόπολη Ταμασού και Ορεινής αποτελεί', until: 'ΣΥΝΟΠΤΙΚΟΣ ΚΑΤΑΛΟΓΟΣ' } },
  { slug: 'trimythous', kind: 'metropolis', name: { el: 'Ιερά Μητρόπολη Τριμυθούντος', en: 'Metropolis of Trimythous' }, seat: { el: 'Τριμυθούς (προσωρινή έδρα Δάλι)', en: 'Trimythous (temporary seat Dali)' },
    website: 'https://imtrimythountos.org.cy/', feed: 'https://imtrimythountos.org.cy/feed/', logo: '' },
  { slug: 'karpasia', kind: 'bishopric', name: { el: 'Ιερά Επισκοπή Καρπασίας', en: 'Bishopric of Karpasia' }, seat: { el: 'Αιγιαλούσα (προσωρινά στην Ιερά Αρχιεπισκοπή, Λευκωσία)', en: 'Yialousa (temporarily at the Archbishopric, Nicosia)' },
    website: '', feed: '', logo: '' },
  { slug: 'arsinoe', kind: 'bishopric', name: { el: 'Ιερά Επισκοπή Αρσινόης', en: 'Bishopric of Arsinoe' }, seat: { el: 'Περιστερώνα Πάφου', en: 'Peristerona (Paphos)' },
    website: 'https://impaphou.org/', feed: '', logo: '',
    history: { url: 'https://impaphou.org/episkopi-arsinois/istoriko-episkopis-arsinois/', from: 'Την Εκκλησία της Πάφου αποτελούσαν', until: null } },
  { slug: 'amathus', kind: 'bishopric', name: { el: 'Ιερά Επισκοπή Αμαθούντος', en: 'Bishopric of Amathus' }, seat: { el: 'Άγιος Τύχων', en: 'Agios Tychon' },
    website: 'https://iml.cy/', feed: '', logo: '',
    history: { url: 'https://iml.cy/article/istoriko-episkopis/', from: 'Η πόλη της Αμαθούντος', until: SIDEBAR_DATE } },
];


const text = (h) => h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/­/g, '') // soft hyphens
  .replace(/\s+/g, ' ').trim().normalize('NFC');

async function history({ url, from, until }) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = (await res.text()).replace(/<(script|style|nav|footer)[\s\S]*?<\/\1>/gi, '');
  const blocks = [...html.matchAll(/<(p|h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => ({ tag: m[1].toLowerCase(), t: text(m[2]) })).filter((b) => b.t);
  const strip = (s) => s.replace(/­/g, '');
  const start = blocks.findIndex((b) => b.t.includes(strip(from)));
  if (start < 0) throw new Error(`start marker not found on ${url}`);
  let end = until ? blocks.findIndex((b, i) => i > start && (b.t.includes(until) || (until === SIDEBAR_DATE && /^\S+ \d{4}$/.test(b.t)))) : -1;
  if (end < 0) end = blocks.length;
  const body = blocks.slice(start, end)
    .filter((b, i, all) => all.findIndex((x) => x.t === b.t) === i) // drop repeated blocks
    .map((b) => (b.tag === 'p' ? b.t : `## ${b.t}`)).join('\n\n');
  const domain = new URL(url).hostname.replace(/^www\./, '');
  return `${body}\n\n*Πηγή: [${domain}](${url})*`;
}

const out = [];
for (const [i, s] of SEES.entries()) {
  const entry = {
    slug: s.slug, sort: i, kind: s.kind, website: s.website, feed: s.feed, logo: s.logo,
    content: {
      el: { name: s.name.el, seat: s.seat.el, summary: '', history: '' },
      en: { name: s.name.en, seat: s.seat.en, summary: '', history: '' },
    },
  };
  if (s.history) {
    try {
      entry.content.el.history = await history(s.history);
      console.log(`${s.slug}: history ${entry.content.el.history.length} chars`);
    } catch (e) {
      console.log(`${s.slug}: history skipped (${e.message})`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  out.push(entry);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${out.length} sees → data/imports/metropolises.json`);
