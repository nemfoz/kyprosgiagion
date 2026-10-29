# Project status & handover — Οδοιπορικό (formerly Κύπρος – Αγίων Γη)

_Last updated: 2026-10-29 (live at https://odoiporiko.com on our own server; Vercel removed — see §0, §4). Read this first when continuing work in a new session._

## 0. Rebrand + editions + self-hosting (2026-10-28) — START HERE

The project is now **Οδοιπορικό** (Latin: **Odoiporiko**) — an umbrella brand for all Orthodox churches;
"Κύπρος – Αγίων Γη" is the title of the Cyprus edition. Domains bought by the owner: **odoiporiko.com** (main)
and **odiporiko.com** (301 → main). Name, taglines, editions, domains, 15 logo concepts: [`BRAND.md`](BRAND.md).
**Logo selection is paused** (the ☦ mark stays until then).

Done 2026-10-28 (see §2 "Editions", "Visits", "Information pages", §4 "Self-hosting"):
- Site renamed everywhere (titles, manifest, OG images, e-mails, headers; brand + edition subtitle in the header).
- `/` = Odoiporiko home (choose a Church), `/cyprus` = Cyprus landing, `/cyprus/map`, `/cyprus/site/x`,
  `/cyprus/metropolis/x`; old URLs 308-redirect.
- Visited churches + "My odoiporiko" profile; About/Contact/Privacy/Cookies/Terms, footer, cookie notice.
- Docker image + compose; the data was moved off Vercel with a one-off export/import (removed afterwards).

**Live 2026-10-29:** https://odoiporiko.com runs in Docker on sv.hasnofriends.com (§4); www and odiporiko.com 301 to it.
The Vercel code (Blob, Turso, `vercel.json`, the one-off export) is gone; the owner deletes the Vercel project
(kyprosgiagion.vercel.app stops working). Deploy with `npm run deploy` — **pushing to GitHub no longer deploys.**
Nightly backups on the server (`scripts/backup.mjs`, same disk only — an off-server copy is still to do).
The legal texts (privacy/terms) are drafts — the owner/Foundation should review them; contact e-mail
(`contact@odoiporiko.com` placeholder) and the Foundation's link are set at `/admin/pages`.

A bilingual (Greek/English) web map of the churches and monasteries of Cyprus, starting with
**Famagusta District and the Karpasia peninsula**. Built for the Holy Metropolis of
Constantia–Ammochostos / the Archbishopric, to be handed over to them free of charge.

- **Live:** https://odoiporiko.com (Docker on sv.hasnofriends.com; deploy with `npm run deploy`)
- **Repo:** https://github.com/nemfoz/kyprosgiagion — branch `main` (pushing does not deploy)
- **Owner / superadmin:** nmf@hnf.sh (first-superadmin bootstrap; see Auth)
- Developer docs (commands, structure, deploy): [`README.md`](../README.md)

---

## 1. Stack

Next.js 16.3 (App Router, Turbopack) · React 19.3 · Tailwind CSS 4 · shadcn/ui (Radix, "nova" preset,
`cn` package) · Better Auth 1.7 (email/password + admin plugin + captcha plugin) · Drizzle ORM on
libSQL (SQLite file; on the server `storage/app.db`) · photos on disk (`uploads/`) · MapLibre GL 5.24 with
3D terrain (Mapterhorn DEM, Esri satellite, Natural Earth coastline, OSM district outlines).

Next.js 16 note: **read `node_modules/next/dist/docs/` before writing Next code** (see `AGENTS.md`).
Request APIs are async-only (`await params`, `await searchParams`, `await headers()`); `middleware` is
now `proxy` (not used here); use `PageProps<"/route">` / `RouteContext<…>` type helpers (`npx next typegen`).

## 2. What exists (features)

**Editions** (`lib/editions.ts`): `EDITIONS` lists the autocephalous Churches (diptych order); only Cyprus is active.
Build Cyprus links with `paths.*` (`paths.site(slug)`, `paths.map`, `paths.metropolis(slug)`…) wrapped in `localePath`.
`brandName(lang)`: Οδοιπορικό in Greek, Odoiporiko in every other language. Every region belongs to Cyprus for now.

**Visits** (`lib/visits.ts`, tables `visits`, `profiles`): a church page's "Have you been here?" card — "I'm here"
checks the browser's position server-side (≤300 m, 1500 m for approximate pins, minus up to 100 m of GPS accuracy)
and records a *verified* visit; "I've been here before" records an unverified one (a later check-in upgrades it).
The position is never stored. `/profile` ("My odoiporiko"): X of Y overall, by country, region and see, milestones,
contribution badges, the list with dates. Private by default; a switch makes `/u/<userId>` public (short name,
counts, badges — no dates, no list). The map list shows ✓ on visited churches.

**Information pages** (`lib/pages.ts`, `components/info-page.tsx`, `app/(info)/*`): about, contact, privacy, cookies,
terms (Markdown; `{email}`, `{foundation}`, `{site}` filled in); superadmins edit the texts, contact e-mail and the
El Frank Foundation link at `/admin/pages` (`settings` key `pages`). Footer on every public page (`SiteFooter`; a short
one under the map list): page links + "An El Frank Foundation project · powered by hnf.sh". Cookie notice (only
essential cookies → informs, no consent) shown once, remembered in local storage.

**Public**
- `/cyprus/map` 3D map (MapLibre): list panel with search, Region and Metropolis dropdowns (`?region=`, `?metropolis=`;
  a Metropolis frames its churches) and type filters,
  fly-to on select, pins grouped into numbered clusters while zoomed out (supercluster, up to zoom 13; click zooms in),
  3D/2D and Map/Satellite toggles, district mask (rest of Cyprus faded),
  Greek/English toggle (`?lang=en`), completeness bar per church in the side panel (signed-in users only).
- Content sidebars (church, name days, Metropolis, contribute pages) are on the right and sticky on wide screens.
- `/cyprus/site/[slug]` church page: hero photo; compact sticky sidebar on the right (details + completeness card for
  signed-in users only — visitors never see completeness — and the 5 nearest churches with distance); history (simple Markdown — a YouTube link alone in
  a paragraph is embedded), YouTube videos, gallery with lightbox ("old photograph" label on archive photos),
  sources (links always show their destination domain); the 3D map closes the page edge to edge with a
  name/coords/Google Maps card on top.
- **Name-day bar** above every header (public and admin), titled «Ονομαστικές εορτές»: yesterday, today (+ movable feast), tomorrow → `/eortologio`.
- `/eortologio` name-day calendar: today, this year's (or next) Easter date, month view (?y=&m=), name search (?q=), the year's
  movable feasts. Fixed days: `data/namedays.json` (built by `scripts/fetch-namedays.mjs` from newsbeast.gr, years
  2024–2026 compared); Easter-dependent days computed in `lib/namedays.ts` (Orthodox Easter, Lazarus, Palm Sunday,
  Life-giving Spring, Thomas, Whit Monday; St George/St Mark move after Easter when they fall before it).
- `/cyprus/metropolis` + `/cyprus/metropolis/[slug]`: the 13 sees of the Church of Cyprus (Archdiocese, 9 Metropolises,
  Bishoprics of Karpasia, Arsinoe, Amathus) — history (from their own sites, with source link), latest news from
  their RSS feeds (titles/links only; refreshed in the background via `after()` at most hourly, stored in
  `metropolis_news`), and the churches on our map that belong to each (`sites.metropolis_id`). Church pages link
  their Metropolis.
- `/contribute` gamification page: overall map completeness, pages that need help (filterable by section,
  least complete first), leaderboard (first name + last initial), how points work, titles and badges.
- **Languages** (`lib/locales.ts`): Greek (plain URLs) and `/en/`, `/ru/`, `/uk/`, `/ro/`, `/bg/`, `/sr/` (Cyrillic), `/ka/`.
  `proxy.ts` rewrites the prefix to `?lang=` for the pages (and redirects old `?lang=` links, 308); build links with
  `localePath(path, lang)`. `Lang` (el/en) stays the type for the admin, scoring and required content; `Locale` is any
  public language. Interface text for the extra languages: `lib/messages/locales/<code>.ts` (AI-drafted, to be checked
  by native speakers; missing keys fall back to English, then Greek). Labels kept as data (types, regions, badges,
  feasts, see names) use `trData("data.…", record, lang)`. Church texts: optional `content.<locale>` (name, location,
  summary, history, facts), edited in the editor's "Άλλες γλώσσες" tab; untranslated pages show English with a
  "translate it" notice, and are left out of the sitemap/hreflang (canonical → English). A complete translation earns
  the `translation` bonus (+20, per language). Name days stay Greek names on the new calendar (note for other languages).
- **Translation fixes**: `/admin/translations?locale=ru` — every signed-in user can suggest a fix (table
  `translation_suggestions`), admins approve/reject (count in the sidebar), superadmins edit directly; approved texts are
  overrides in `settings.translations`. The language menu on public pages links there ("Suggest a better translation").
- Admin language without a cookie: Greek for Greek browsers, English otherwise.
- Light theme only (the dark theme was removed 2026-10-27).
- **Phones** (below the `md` breakpoint, 768px): the map fills the screen and the list is a sheet over it with three heights
  (peek/half/full; drag or tap the handle — `components/map/explorer.tsx`, `--sheet-h`); filters fold behind a button with a
  count; choosing a church opens its card at half height with the pin kept above it. **"Near me"** (map, all sizes) uses
  the browser's location: sorts the list by distance, shows distances, frames you + the 3 nearest churches. Place names
  under a pin/cluster are hidden. Header navigation becomes a ☰ menu (`components/mobile-nav.tsx`). Church pages: Directions +
  Share buttons under the hero, a sticky row of section links on phones (## headings get ids `s1, s2…` in `markdown()`),
  photos as a swipeable row, swipe in the lightbox. Text fields are 16px on touch screens (iOS would zoom otherwise).
  Styled 404 (`app/not-found.tsx`). Editor: "Take a photo" (camera) and "My location" in the location picker.
- **Performance** (2026-10-28):
  - Map pins, clusters and place names are drawn by MapLibre (`addSiteLayers`/`setSitePoints`/`setPlaces` in
    `components/map/terrain.ts`; images drawn on canvas, ids `pin:<type>[:approx]`, `cluster:<n>`, `label:<major|minor>:<text>`).
    Don't go back to HTML markers on 3D maps: each one reads the GPU depth buffer while the map moves. Place names hide
    themselves under pins (symbol collision). Maps render at most 1.5 device pixels per CSS pixel (`PIXEL_RATIO`), tilt ≤ 65°,
    one elevation source shared by terrain and hill shading. The church-page map starts when scrolled near.
  - Fonts are variable Noto; only Greek + Latin preloaded (~200 KB).
  - Public data is cached across requests (`lib/cache.ts` → `cached()`, tag `public`): `siteSummaries` (map/lists/nearby/
    sitemap, no histories), `publicSite(slug)`, `publicMetropolises/…Page/…Metropolis`, `publicMissionBoard`,
    `publicLeaderboard`, interface overrides, points. **Every write to public content must expire the tag** —
    `updateTag(PUBLIC_TAG)` in server actions (done in the `refresh`/`run` helpers), `revalidateTag(PUBLIC_TAG, { expire: 0 })`
    in route handlers. Cache keys include the deployment id, so each deploy (and its migrations) starts fresh.
    Admin pages and read-modify-write paths read the database directly.
  - Sessions: `getSession` is per-request cached; Better Auth keeps the session in a cookie for 5 min (a ban or role
    change takes up to 5 min to apply to a signed-in browser).
- **Installable app + offline**: `app/manifest.ts` (icons in `public/`, `app/apple-icon.png`), `viewportFit: cover` with
  safe-area padding. `public/sw.js` (registered in production only) keeps visited public pages (network first) and
  immutable build files/photos (cache first, max 400) for use without signal; `public/offline.html` otherwise. Never
  stores the admin, API or account pages. Map tiles are not stored (the map is blank offline; the list works).
  Bump `VERSION` in `sw.js` to drop old caches.
- `/contribute` is labelled «Πάρτε μέρος» in Greek (owner's choice; «Συνεισφέρετε» sounded like a donation request).
- **Photo copies**: every stored photo has `name.sm.webp` (320px, lists/thumbnails) and `name.md.webp` (960px, cards,
  gallery, hero on phones) next to the original (`lib/photo-sizes.mjs` naming + `sized()`, `lib/photo-variants.mjs`
  sharp). Made on upload and once for older photos by migrate (`variants:photos`); `/media` (old addresses) and `/uploads` serve the
  original while a copy is missing. The lightbox and desktop hero use the original.
- **SEO/sharing** (`lib/seo.ts`): per-church OG image `app/site/[slug]/opengraph-image.tsx` (first photo + Greek and
  English name; fonts in `assets/fonts`), default `app/opengraph-image.tsx`; canonical + hreflang (Greek = plain URL,
  English = `?lang=en`); `sitemap.xml` (both languages) and `robots.txt`; schema.org
  Church/PlaceOfWorship JSON-LD on church pages. Absolute URLs use `SITE_URL`.
- Palette: exactly three colours taken from the Orthodox Church sites in `docs/sourcs.md`:
  crimson `#6b1d1d`, gold `#ad8840`, parchment `#ece8de` (`--crimson/--gold/--parchment` in
  `app/globals.css`). Every other token (ink text, muted text, cards, borders, pin types, map colours
  in `components/map/terrain.ts`, e-mail colours) is a `color-mix` shade of these. Use `text-gold-deep`
  for gold text (plain gold is too faint on parchment). Don't add new hues.
- Design: "atlas" look, arched thumbnails, intro panel, map caption. Fonts Noto Serif/Sans (Greek).

**Accounts & roles** (Better Auth; `lib/permissions.ts`)
- **user**: signs up, confirms e-mail → account active (`approved=true` set in `afterEmailVerification`).
  Proposes new churches/changes (texts, location, photos) → moderation queue.
- **admin**: edits/publishes directly, reviews proposals (field-by-field diff), can verify a proposed
  location, can revoke/restore a user's right to propose.
- **superadmin**: all of the above + user management via Better Auth admin API (roles, create accounts,
  ban, delete, confirm e-mail by hand). `adminRoles: ["superadmin"]`.
- First-superadmin bootstrap: until a *confirmed* superadmin exists, signing up with an address in
  `SUPERADMIN_EMAILS` is allowed even without e-mail configured and is auto-confirmed; the form signs in.
- Spam protection on sign-up (before anything is sent): Cloudflare Turnstile (when keys set), honeypot
  header `x-website`, minimum fill time header `x-form-age` (≥3 s), disposable-domain block
  (`lib/antispam.ts`), DB-backed rate limits (5 sign-ups/h per IP etc.).
- Sign-ups are refused (`EMAIL_NOT_CONFIGURED`) while `REQUIRE_EMAIL=1` (the server) and `RESEND_API_KEY` is missing, except the
  bootstrap case. Forgot/reset password pages exist (need Resend).

**Admin** (`/admin`, Greek or English — switch at the bottom of the left sidebar, remembered in the `admin_lang` cookie)
- Left sidebar (slide-out sheet on phones).
- **All interface text** lives in `lib/messages/{public,admin,shell,editor,auth}.ts` as `{el, en}` per key and can be
  edited by superadmins at `/admin/translations` (overrides stored as JSON in `settings`, key `translations`).
  Use `getT()`/`getAdminT()` on the server (`lib/i18n-server.ts`) and `useT()`/`useAdminT()` in client components
  (`components/i18n-provider.tsx`). Server errors are thrown as `UserError(key)` and translated by the actions' `run()`.
- `/admin/metropolises` (admins): edit texts (bilingual), website, feed, logo (a pasted link is copied to storage),
  "fetch news now"; assign churches in the church editor ("Μητρόπολη" field).
- Overview with personal progress (title, points, rank, badges, suggested missions).
- `/admin/sites` list + editor (`components/admin/site-form.tsx`): bilingual tabs, satellite location
  picker, photo manager (upload with browser-side resize to ≤2400px; import by URL = copied, never
  hotlinked; captions, credit, source link, order), live completeness bar and points estimate.
  Users get the same form in "propose" mode. Videos: paste a YouTube link (`videos` table stores only the
  video id; embedded via youtube-nocookie.com).
- `/admin/submissions` queue + review page (diff, points estimate, verify location, publish).
- `/admin/users` (admins: proposal rights; superadmin: roles/ban/delete/create/confirm e-mail).
- `/admin/points` (superadmin): every point value — sections (must sum to 100 per language), bonuses,
  per-proposal points, title thresholds. Stored as JSON in `settings` (key `points`, `lib/points.ts`); saving
  recalculates `submissions.points` for every approved proposal from its `completed` list.

**Gamification** (`lib/completeness.ts`, `lib/contributors.ts`)
- Values below are the defaults; superadmins change them at `/admin/points`.
- Each language version of a page is worth **100 points** (Greek 100 + English 100 = 200), split by section:
  history 35, short description 10, key facts ≥3 lines 10, name+place 5 (per language); photo 15, verified
  location 15, sources ≥2 10 (shared — one answer counts in both languages, so worth 30/30/20).
  Page % = points / 200. Placeholder text ("θα συμπληρωθεί", "will be added", "Δείγμα κειμένου") doesn't count.
- **Bonus points** (don't change the page %): +5 per additional photo beyond the first, +10 per old/archive photo
  (`photos.historic`, a checkbox in the photo manager), +10 per YouTube video.
- Approved proposal = 5 points + sections it newly completed + bonuses (stored in `submissions.points`,
  `submissions.completed` — mission keys like `history.el`, `photo`, plus bonus keys). Admin direct edits earn nothing.
  Old keys from before the per-language scoring are mapped (`LEGACY`) and rewritten on the next recalculation.
- Titles (deliberately lay, not clerical): Νέος συνεργάτης 0 → Συνεργάτης 75 → Καταγραφέας μνημείων 250 →
  Χρονικογράφος 600 → Θεματοφύλακας της μνήμης 1500. Badges (3 each): Συντάκτης (Greek texts), Μεταφραστής
  (English texts), Ερευνητής πηγών (facts/sources), Φωτογράφος, Αρχειονόμος (old photos), Χαρτογράφος (locations);
  plus Πρώτη συνεισφορά (1) and Σταθερός συνεργάτης (10 approvals).

## 3. Data & content

- Tables: `sites` (+ `metropolis_id`), `photos` (with `source_url`, `historic`), `videos`, `metropolises`, `metropolis_news`,
  `settings` (keys `points`, `translations`), `submissions`, Better Auth `user`/`session`/`account`/
  `verification`, `rate_limit`, `data_imports`. Defined twice — keep in sync:
  `scripts/schema.mjs` (SQL, created by migrate) and `lib/db/schema.ts` (Drizzle). snake_case columns.
- Content per site is a JSON blob `{el:{name,location,summary,body,facts,sources}, en:{…}}`.
- Live data: **40 published churches** = 9 samples (Panagia Theotokos Trikomo has the full text from
  `test.html`; 8 Karpasia drafts with approximate coords) + 31 occupied parishes from the Metropolis
  website (`data/imports/imconstantias-occupied.json`, scraped by `scripts/fetch-imconstantias.mjs`;
  27 exact Google-Maps pins, 4 approximate: Arnadi, Pigi, Syngrasis, Kato Deryneia; Ayios Georgios
  Salaminos skipped — no location). Photos permitted by the Metropolis; credit + source link shown.
  Committee member names/phones on their pages were deliberately NOT imported.
- The 31 imported churches have placeholder history (map completeness is low).

## 4. Deployment & infrastructure (important)

Since 2026-10-29 production is **our own server**, not Vercel (README "Self-hosting", "Deploying", "Backups").
- **Server:** sv.hasnofriends.com (142.132.206.83, Ubuntu). SSH as `nmf` **only** (other usernames trigger fail2ban);
  `nmf` is in the `docker` group but has no passwordless sudo — nginx/certbot changes are done by the owner.
  Non-interactive SSH: add `-T` and `< /dev/null` (and `-T` on `docker compose run/exec`), or commands hang.
- **Stack dir:** `/srv/nvme/platform/stacks/projects/odoiporiko.com/app` — compose project `odoiporiko`, container
  `odoiporiko-app-1` on `127.0.0.1:4002`, runs as uid 1001 (`APP_UID`). `.env` there holds the secrets (SITE_URL,
  BETTER_AUTH_URL/SECRET, APP_HOSTS, SUPERADMIN_EMAILS, HOST_PORT, APP_UID, APP_BUILD_ID). Don't name a variable `PORT`
  in it — Next would listen on it inside the container.
- **Data:** `storage/` → `/data`: `app.db` (SQLite, WAL), `uploads/` (photos; `/app/uploads` links there),
  `backups/<day>/` (nightly 03:30, `nmf` crontab, 14 days), `dump.json` (the Vercel export of 2026-10-28, kept).
- **nginx:** `/etc/nginx/sites-enabled/odoiporiko.com.conf` = `deploy/nginx-odoiporiko.com.conf`; Let's Encrypt
  certificate for odoiporiko.com, www, odiporiko.com, www (expires 2027-01-27, certbot renews). DNS at Cloudflare,
  grey cloud (if it is turned orange, set SSL/TLS to Full (strict) first).
- **Deploy:** `npm run deploy` (rsync + `docker compose up -d --build`; a new `APP_BUILD_ID` empties the caches).
  Migrations run on every container start — still the way to change production data (`scripts/migrate.mjs`).
- **Vercel:** the project `has-no-friends/kyprosgiagion` (Turso DB, Blob store) is no longer used; the owner deletes it.

### Environment variables (server `.env`)
| Variable | Status |
|---|---|
| `SITE_URL`, `BETTER_AUTH_URL` | `https://odoiporiko.com` |
| `BETTER_AUTH_SECRET` | set (new on the server; old Vercel sessions are invalid) |
| `SUPERADMIN_EMAILS` | `nmf@hnf.sh` |
| `RESEND_API_KEY`, `EMAIL_FROM` | **not set yet** — sign-ups refused until then (except the first superadmin) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | **not set yet** (CAPTCHA off). The site key is baked in at build time — pass it as a build arg when added |

Local dev: `.env.local` has `BETTER_AUTH_SECRET`, `SUPERADMIN_EMAILS=super@example.test`.

## 5. Local development & testing

```bash
npm install && npm run migrate && npm run dev     # http://localhost:3000, DB = data/app.db
```
Local test accounts (data/app.db only): `super@example.test` / `supersecret1` (superadmin),
`admin@example.test` / `adminsecret1` (admin), `maria@example.test` / `usersecret1` (user).
E-mails print to the dev server console when `RESEND_API_KEY` is missing.
Testing was done with headless Chrome driven over CDP (Node script with a built-in WebSocket) for
screenshots and click-through flows; WebGL needs `--use-angle=swiftshader --enable-unsafe-swiftshader`.
Cloudflare Turnstile test keys: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
Rate limiting is only on in production (or `RATE_LIMIT=1`).

## 6. Owner preferences & decisions

- Greek first, English second (admin UI in both, Greek default).
- **No hotlinks**: every image is stored in our storage; the original page is kept as a visible source link.
- Links in texts always show their destination domain.
- Default map shows no third-party place names or borders (own outlines + labels); rest of Cyprus faded.
- Light theme only; three-colour palette (crimson, gold, parchment) from the church sources.
- Missing information is shown as a challenge (gamification) — but only to signed-in users; visitors browsing
  the map and church pages don't see completeness bars (/contribute stays public).
- Resend/e-mail postponed until moving to the real production environment.
- Commit messages end with `Co-Authored-By: Claude …`; deploy with `npm run deploy` (pushing does not deploy).

## 7. Known issues / gotchas

- Local photos live in `./uploads` (gitignored); production has its own in the server's `storage/uploads`.
- `scripts/fetch-imconstantias.mjs` depends on the Metropolis site's Elementor markup; re-check if it changes.
- `scripts/sync.mjs` copies churches and photos only — not videos, Metropolises or Metropolis assignments.
- Metropolis sources: churchofcyprus.org.cy is behind a Cloudflare challenge (no feed/history/logo for the
  Archdiocese); imkitiou.org's robots.txt disallows crawlers (Kition has no feed, nothing scraped); Kyrenia has no
  history page and stale news; Kykkos/Trimythous have no usable history page. Admins can fill these in by hand.
  Arsinoe/Amathus share their parent Metropolis's website, so they have no feed of their own.
- Church → see assignment: the 31 churches from the Constantia–Ammochostos parish list → Constantia; the 8 Karpasia
  churches (Trikomo included) → **Bishopric of Karpasia** (a separate see since 2007, per the Church's 2024
  "Διοικητική Συγκρότησις"; confirmed by the owner). Panagia Kantariotissa is unassigned — an admin should set it.
- The project is a demo for the Church of Cyprus, so using texts and photos from the Church's own sites is permitted
  (still always with a visible source link).
- Drizzle renders `${sites.id}` unqualified inside raw `sql` subqueries — write `"sites"."id"` explicitly.

## 8. Next steps (roadmap agreed 2026-10-27)

**Done 2026-10-27:** items 2 (photo copies), 4 (SEO/sharing) and 5 (clustering + nearby churches).
Then (same day): `/en/` URLs and six more languages with user-suggested fixes (see §2 "Languages").
Suggested next: 1 (backups) — production still has none — then 3 (feast days). Also: have native speakers check the
drafted translations (agents' notes: see names in Bulgarian/Serbian, Georgian feast names, plural forms in Russian).

1. **Backups**: nightly on the server since 2026-10-29 (README "Backups"). Still to do: an off-server copy and a
   tested restore.
2. ~~Image performance~~ — done (see §2 "Photo copies").
3. **Feast days / panigyria**: patron saint + feast day per church (+ century, current state: in use / ruined /
   occupied) as structured fields and map filters. Tie into name days: "Πανηγυρίζουν σήμερα" in the name-day bar
   and `/eortologio`, "celebrating this week" map filter, feast-day countdown on church pages, new mission for points.
4. ~~SEO / sharing~~ — done (see §2), now with `/en/…` paths. Possible later: submit the
   sitemap in Google Search Console once the custom domain is set (then set `SITE_URL`).
5. ~~Pin clustering + "nearby churches"~~ — done.
6. **More content**: more regions + region management in the admin; importers from the Metropolis parish lists
   (Constantia ~89, Paphos ~114, Tamassos ~50, Kition 46, Limassol/Amathus, Morphou, Trimythous) or the Church's
   2024 PDF (strip clergy/committee names and phones). The 31 imported churches still have placeholder history.
7. Change history / undo (audit log of edits and approvals).
8. Contributor e-mails (approved/rejected, points) — after Resend.
9. English translations of the Metropolis histories (only Greek was imported).
Smaller: analytics, error monitoring, a staging copy,
monthly leaderboard, public contributor profiles.

**Decided by the owner (2026-10-27):**
- Karpasia assignment confirmed: the 8 Karpasia churches (Trikomo included) belong to the Bishopric of Karpasia.
- Permission for the Metropolis history texts: yes — the project is a demo for the Church of Cyprus.
- Priority: polish what's already there until the owner is happy with it, then continue with the roadmap.

**Owner will look at later** (don't act on these unprompted): which see Panagia Kantariotissa belongs to;
Turnstile keys; Resend.
