// Builds data/namedays.json (the Greek Orthodox name-day calendar) from newsbeast.gr's εορτολόγιο.
// Usage: node scripts/fetch-namedays.mjs
//
// Fixed name days are the same every year; the ones that depend on Easter (Λάζαρος, Βάιος, Πάσχα,
// Ζωοδόχου Πηγής, Θωμάς, Αγίου Πνεύματος…) and Γεώργιος/Μάρκος (moved after Easter when they fall
// before it) are written as rules relative to Easter and computed per year by lib/namedays.ts.
// The source leaves some Easter names on the previous year's dates, so a movable name is only kept
// as a fixed one when all three years agree on its date.

import fs from 'node:fs';

const YEARS = [2024, 2025, 2026]; // three different Easter dates (5 May, 20 April, 12 April)
const BASE = 2026; // the most recent listing (combined with the year before)
const OUT = new URL('../data/namedays.json', import.meta.url);
const UA = { 'User-Agent': 'kyprosagiongi-importer/0.1 (heritage map; contact via site admin)' };

// Days relative to (Orthodox) Easter Sunday. `names` celebrate that day; `feast` is shown as the day's feast.
const MOVABLE = [
  { offset: -48, feast: { el: 'Καθαρά Δευτέρα', en: 'Clean Monday' }, names: [] },
  { offset: -42, feast: { el: 'Κυριακή της Ορθοδοξίας', en: 'Sunday of Orthodoxy' }, names: ['Ορθοδοξία', 'Ορθούλα', 'Δόξα', 'Άξιος', 'Άξια'] },
  { offset: -8, feast: { el: 'Σάββατο του Λαζάρου', en: 'Lazarus Saturday' }, names: ['Λάζαρος', 'Λαζαρούλα'] },
  { offset: -7, feast: { el: 'Κυριακή των Βαΐων', en: 'Palm Sunday' }, names: ['Βάιος', 'Βάια', 'Βάγια', 'Δάφνη'] },
  { offset: -6, feast: { el: 'Μεγάλη Δευτέρα', en: 'Holy Monday' }, names: [] },
  { offset: -5, feast: { el: 'Μεγάλη Τρίτη', en: 'Holy Tuesday' }, names: [] },
  { offset: -4, feast: { el: 'Μεγάλη Τετάρτη', en: 'Holy Wednesday' }, names: [] },
  { offset: -3, feast: { el: 'Μεγάλη Πέμπτη', en: 'Holy Thursday' }, names: [] },
  { offset: -2, feast: { el: 'Μεγάλη Παρασκευή', en: 'Good Friday' }, names: [] },
  { offset: -1, feast: { el: 'Μεγάλο Σάββατο', en: 'Holy Saturday' }, names: [] },
  { offset: 0, feast: { el: 'Άγιο Πάσχα', en: 'Easter Sunday' }, names: ['Αναστάσιος', 'Αναστασία', 'Ανέστης', 'Λάμπρος', 'Λαμπρινή', 'Πασχάλης', 'Πασχαλίνα'] },
  { offset: 1, feast: { el: 'Δευτέρα του Πάσχα', en: 'Easter Monday' }, names: [] },
  { offset: 2, feast: { el: 'Αγίων Ραφαήλ, Νικολάου και Ειρήνης', en: 'Saints Raphael, Nicholas and Irene' }, names: ['Ραφαήλ', 'Ραφαέλα', 'Νικόλαος', 'Ειρήνη'] },
  { offset: 5, feast: { el: 'Ζωοδόχου Πηγής', en: 'Life-giving Spring' }, names: ['Ζωή', 'Ζήσης', 'Ζώης', 'Πηγή'] },
  { offset: 7, feast: { el: 'Κυριακή του Θωμά', en: 'Thomas Sunday' }, names: ['Θωμάς', 'Θωμαή'] },
  { offset: 39, feast: { el: 'Ανάληψη', en: 'Ascension' }, names: [] },
  { offset: 49, feast: { el: 'Πεντηκοστή', en: 'Pentecost' }, names: [] },
  { offset: 50, feast: { el: 'Αγίου Πνεύματος', en: 'Whit Monday' }, names: ['Τριάδα', 'Κορίνα'] },
];
// Fixed feasts moved to after Easter when they fall on or before Easter Sunday.
const MOVED_AFTER_EASTER = [
  { date: '04-23', offsetIfMoved: 1, feast: { el: 'Αγίου Γεωργίου', en: 'Saint George' }, names: ['Γεώργιος', 'Γεωργία'] },
  { date: '04-25', offsetIfMoved: 2, feast: { el: 'Αποστόλου Μάρκου', en: 'Saint Mark' }, names: ['Μάρκος', 'Μαρκία'] },
];
// Day labels in the source that are feasts, not names.
const FEAST_LABEL = /^(Καθαρά Δευτέρα|Μεγάλη |Μεγάλο |Άγιο Πάσχα|Κυριακή |Του Αγίου Πνεύματος)/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().normalize('NFC');

// <time class="date" date-time="2026-01-03">Σάββατο - 03/01</time><h3 class="names">Γενοβέφα, Γενεβιέβη</h3>
async function month(year, m) {
  const url = `https://www.newsbeast.gr/eortologio/${year}-${String(m).padStart(2, '0')}-01`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  const days = {};
  for (const [, date, names] of html.matchAll(/date-time="\d{4}-(\d\d-\d\d)"[^>]*>[^<]*<\/time>\s*<h3[^>]*class="names"[^>]*>([\s\S]*?)<\/h3>/g)) {
    days[date] = decode(names).split(',').map((n) => n.trim()).filter(Boolean);
  }
  return days;
}

const byYear = {};
for (const y of YEARS) {
  byYear[y] = {};
  for (let m = 1; m <= 12; m++) {
    Object.assign(byYear[y], await month(y, m));
    await sleep(400);
  }
  console.log(`${y}: ${Object.keys(byYear[y]).length} days`);
}

const movableNames = new Set([...MOVABLE, ...MOVED_AFTER_EASTER].flatMap((r) => r.names));
const everyYear = (date, name) => YEARS.every((y) => byYear[y][date]?.includes(name));
const dates = [...new Set(YEARS.flatMap((y) => Object.keys(byYear[y])))].sort();

const fixed = {};
for (const date of dates) {
  // The two most recent years (each misses a few names), plus 29 February from the leap year.
  const source = date === '02-29' ? byYear[2024][date] ?? [] : [...(byYear[BASE][date] ?? []), ...(byYear[BASE - 1][date] ?? [])];
  const names = [...new Set(source)].filter((n) => !FEAST_LABEL.test(n) && (!movableNames.has(n) || everyYear(date, n)));
  if (names.length) fixed[date] = names;
}

fs.writeFileSync(OUT, JSON.stringify({
  source: 'https://www.newsbeast.gr/eortologio',
  fetched: new Date().toISOString().slice(0, 10),
  fixed,
  movable: MOVABLE,
  movedAfterEaster: MOVED_AFTER_EASTER,
}, null, 1) + '\n');
console.log(`wrote ${Object.keys(fixed).length} fixed days, ${MOVABLE.length} movable feasts → data/namedays.json`);
