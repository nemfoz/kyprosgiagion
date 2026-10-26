// Reads the "Κατεχόμενες Ενορίες" tab of the Metropolis of Constantia–Ammochostos website and
// writes data/imports/imconstantias-occupied.json (name, village, exact pin, photo, source page).
// Usage: node scripts/fetch-imconstantias.mjs
// The output is meant to be reviewed (English names, types) before running scripts/import.mjs.

import fs from 'node:fs';

const LIST_URL = 'https://imconstantias.org.cy/ieres-mones-ieroi-naoi/';
const TAB_TITLE = 'Κατεχόμενες Ενορίες';
const OFFICE_MAP = 'maps.app.goo.gl/3aPjU1DuutDFjGrp7'; // the Metropolis office, in every page footer
const OUT = new URL('../data/imports/imconstantias-occupied.json', import.meta.url);
const UA = { 'User-Agent': 'kyprosagiongi-importer/0.1 (heritage map; contact via site admin)' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#8211;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim()
  .normalize('NFC'); // the site mixes Greek accent code points (e.g. U+1F77 vs U+03AF)

async function text(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// "Γαϊδουράς. Ιερός Ναός Αγίου Μάμαντος" → village + church name; town churches say "πόλεως Αμμοχώστου".
function splitName(title) {
  const m = title.match(/^([^.]+)\.\s*(.+?)\.?$/);
  if (m && !/Ναό|Ναοί/.test(m[1])) {
    const village = m[1].trim().replace(/^Δερύνεια Κάτω$/, 'Κάτω Δερύνεια');
    return { village, name: m[2].trim() };
  }
  if (/Βαρωσίων/.test(title)) return { village: 'Κάτω Βαρώσια', name: title.replace(/\s*\(.*\)/, '') };
  return { village: 'Αμμόχωστος', name: title.replace(/\s*πόλεως Αμμοχώστου/, '') };
}

async function resolvePin(shortUrl) {
  const res = await fetch(`https://${shortUrl}`, { redirect: 'manual', headers: UA });
  const loc = res.headers.get('location') || '';
  const m = loc.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || loc.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]), mapUrl: `https://${shortUrl}` } : null;
}

const page = await text(LIST_URL);
const tabId = page.match(new RegExp(`aria-controls="([^"]+)"[^>]*>\\s*<span class="e-n-tab-title-text">\\s*${TAB_TITLE}`))?.[1];
if (!tabId) throw new Error(`Tab "${TAB_TITLE}" not found – the page layout may have changed.`);
const start = page.indexOf(`id="${tabId}"`);
const block = page.slice(start, page.indexOf('elementor-location-footer', start) > 0 ? page.indexOf('elementor-location-footer', start) : undefined);

// Each card: image link + heading link to the detail page.
const entries = [];
for (const m of block.matchAll(/<a href="(https:\/\/imconstantias\.org\.cy\/[^"]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[\s\S]*?<a href="\1"[^>]*>([\s\S]*?)<\/a>/g)) {
  if (!entries.some((e) => e.source === m[1])) entries.push({ source: m[1], image: m[2], title: decode(m[3]) });
}
// Cards without a detail page: a plain heading after an image.
const listEnd = block.indexOf('Ιερά Μητρόπολις');
for (const m of block.slice(0, listEnd > 0 ? listEnd : undefined).matchAll(/<img[^>]+src="([^"]+)"(?:(?!<img)[\s\S])*?elementor-heading-title[^>]*>([^<]+)<\/p>/g)) {
  const title = decode(m[2]);
  if (!entries.some((e) => e.title === title)) entries.push({ source: null, image: m[1], title });
}
console.log(`Found ${entries.length} churches. Resolving locations…`);

const out = [];
for (const e of entries) {
  await sleep(400);
  const detail = e.source ? await text(e.source) : '';
  const maps = [...new Set(detail.match(/maps\.app\.goo\.gl\/[A-Za-z0-9]+/g) || [])].filter((u) => u !== OFFICE_MAP);
  const pin = maps.length ? await resolvePin(maps[0]) : null;
  const { village, name } = splitName(e.title);
  out.push({
    title_el: e.title, name_el: name, village_el: village,
    name_en: '', village_en: '',
    lat: pin?.lat ?? null, lng: pin?.lng ?? null, map_url: pin?.mapUrl ?? null,
    image: e.image.replace(/-\d+x\d+(\.\w+)$/, '$1'), // full-size original
    source: e.source ?? LIST_URL,
  });
  console.log(`${pin ? '✓' : '✗ no pin'}  ${e.title}`);
}

fs.mkdirSync(new URL('.', OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${out.length} entries to ${OUT.pathname}`);
