# Brand — Οδοιπορικό / Odoiporiko

_Decided 2026-10-28. Logo not chosen yet — see "Open" below._

## Name

- **Οδοιπορικό** (Greek, mixed case) · **ODOIPORIKO** in Latin script, never translated, in every other language.
  Greek in capitals drops the accent: **ΟΔΟΙΠΟΡΙΚΟ**.
- Meaning: a journey *and* its written account (a pilgrim's travelogue) — the map you travel and the pages people write.
- Goal: start with Cyprus, expand to all Orthodox churches worldwide. The name is deliberately not tied to one
  country, language or Patriarchate (so other Churches can join).
- Rejected along the way: Synaxis (domains taken), Hagiomap, Orthodox Map, Proskynitari, Trouli, Kandylia, etc.

## Domains (bought by the owner 2026-10-28)

- **odoiporiko.com** — main (correct ELOT transliteration of Οδοιπορικό).
- **odiporiko.com** — 301 redirect to the main domain (phonetic spelling people type).
- kyprosgiagion.vercel.app should also redirect to odoiporiko.com once the domain is live.
- E-mail later (Resend): `noreply@odoiporiko.com`.

## Taglines

- el: *Οδοιπορικό στις εκκλησίες και τα μοναστήρια της Ορθοδοξίας*
- en: *A pilgrim's atlas of Orthodox churches*
- ru/uk/ro/bg/sr/ka: to be drafted in `lib/messages/locales/*` and checked by native speakers.

## Structure: regional editions

- **Οδοιπορικό** is the umbrella brand; each region is an edition under it:
  *Οδοιπορικό · Κύπρος – Αγίων Γη* (the old project name lives on as the Cyprus edition's title), later
  *Οδοιπορικό · Κρήτη*, *Odoiporiko · Athos*, …
- Preferred URL shape for editions: paths (`odoiporiko.com/cyprus`), not subdomains.
- If a Church/Metropolis officially blesses an edition, put that on the edition, not the umbrella brand.
- Contributor angle: a user's profile can be "their odoiporiko" (the churches they've added/visited).

## Visual identity

- Palette unchanged: crimson `#6b1d1d`, gold `#ad8840`, parchment `#ece8de` (see PROJECT_STATUS §2).
- Fonts: Noto Serif (wordmark), Noto Sans.

## Logo concepts (not chosen yet)

- All 15 concepts: [`brand/Odoiporiko-15-brand-ideas.pdf`](brand/Odoiporiko-15-brand-ideas.pdf)
  (cover, overview, one board per concept: mark, wordmark, tagline, app icon, on crimson, regional edition).
- Source: [`brand/concepts/gen.mjs`](brand/concepts/gen.mjs) — every mark is hand-written SVG in a 200×200 box
  (`mark(fg, accent, bg)`), so the chosen one can be exported directly as SVG/favicon/app icons.
  Run `node docs/brand/concepts/gen.mjs`, then print `all.html` to PDF with headless Chrome (command in the file header).
- PNG boards of the first four: `brand/concepts/odoiporiko-*.png`.

Concepts: 1 path (dotted route → church pin) · 2 compass (cross as North) · 3 vigil lamp · 4 illuminated initial Ο ·
5 bell tower · 6 footsteps · 7 sunrise in the East · 8 open book · 9 pilgrim's stamp · 10 contour lines ·
11 constellation of pins · 12 halo pin with Orthodox cross · 13 mosaic pin · 14 candles · 15 signpost.

Claude's shortlist: **1 (path)**, **12 (halo)**, **9 (stamp)**; possibly the capital wordmark from 4.

## Open

- Logo choice — owner paused this on 2026-10-28 to first adapt the website to the new name.
- Taglines in the 6 extra languages.
- DNS: point both domains to Vercel (owner, at the registrar) once they're added to the project.
