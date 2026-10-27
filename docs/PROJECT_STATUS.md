# Project status & handover — Κύπρος – Αγίων Γη

_Last updated: 2026-10-27 (bilingual admin, name days, Metropolises, map filters; roadmap in §8). Read this first when continuing work in a new session._

A bilingual (Greek/English) web map of the churches and monasteries of Cyprus, starting with
**Famagusta District and the Karpasia peninsula**. Built for the Holy Metropolis of
Constantia–Ammochostos / the Archbishopric, to be handed over to them free of charge.

- **Live:** https://kyprosgiagion.vercel.app (Vercel project `has-no-friends/kyprosgiagion`)
- **Repo:** https://github.com/nemfoz/kyprosgiagion — branch `main` deploys to production on push
- **Owner / superadmin:** nmf@hnf.sh (first-superadmin bootstrap; see Auth)
- Developer docs (commands, structure, deploy): [`README.md`](../README.md)

---

## 1. Stack

Next.js 16.3 (App Router, Turbopack) · React 19.3 · Tailwind CSS 4 · shadcn/ui (Radix, "nova" preset,
`cn` package) · Better Auth 1.7 (email/password + admin plugin + captcha plugin) · Drizzle ORM on
libSQL (local SQLite file / Turso in production) · Vercel Blob (private store) · MapLibre GL 5.24 with
3D terrain (Mapterhorn DEM, Esri satellite, Natural Earth coastline, OSM district outlines).

Next.js 16 note: **read `node_modules/next/dist/docs/` before writing Next code** (see `AGENTS.md`).
Request APIs are async-only (`await params`, `await searchParams`, `await headers()`); `middleware` is
now `proxy` (not used here); use `PageProps<"/route">` / `RouteContext<…>` type helpers (`npx next typegen`).

## 2. What exists (features)

**Public**
- `/` 3D map (MapLibre): list panel with search, Region and Metropolis dropdowns (`?region=`, `?metropolis=`;
  a Metropolis frames its churches) and type filters,
  fly-to on select, 3D/2D and Map/Satellite toggles, district mask (rest of Cyprus faded),
  Greek/English toggle (`?lang=en`), completeness bar per church in the side panel (signed-in users only).
- Content sidebars (church, name days, Metropolis, contribute pages) are on the right and sticky on wide screens.
- `/site/[slug]` church page: hero photo; compact sticky sidebar on the right (details + completeness card for
  signed-in users only — visitors never see completeness); history (simple Markdown — a YouTube link alone in
  a paragraph is embedded), YouTube videos, gallery with lightbox ("old photograph" label on archive photos),
  sources (links always show their destination domain); the 3D map closes the page edge to edge with a
  name/coords/Google Maps card on top.
- **Name-day bar** above every header (public and admin): yesterday, today (+ movable feast), tomorrow → `/eortologio`.
- `/eortologio` name-day calendar: today, this year's (or next) Easter date, month view (?y=&m=), name search (?q=), the year's
  movable feasts. Fixed days: `data/namedays.json` (built by `scripts/fetch-namedays.mjs` from newsbeast.gr, years
  2024–2026 compared); Easter-dependent days computed in `lib/namedays.ts` (Orthodox Easter, Lazarus, Palm Sunday,
  Life-giving Spring, Thomas, Whit Monday; St George/St Mark move after Easter when they fall before it).
- `/metropolis` + `/metropolis/[slug]`: the 13 sees of the Church of Cyprus (Archdiocese, 9 Metropolises,
  Bishoprics of Karpasia, Arsinoe, Amathus) — history (from their own sites, with source link), latest news from
  their RSS feeds (titles/links only; refreshed in the background via `after()` at most hourly, stored in
  `metropolis_news`), and the churches on our map that belong to each (`sites.metropolis_id`). Church pages link
  their Metropolis.
- `/contribute` gamification page: overall map completeness, pages that need help (filterable by section,
  least complete first), leaderboard (first name + last initial), how points work, titles and badges.
- Light theme only (the dark theme was removed 2026-10-27).
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
- Sign-ups are refused (`EMAIL_NOT_CONFIGURED`) on Vercel while `RESEND_API_KEY` is missing, except the
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

- `npm run build` = `node scripts/migrate.mjs && next build`. **migrate runs on every Vercel build** with
  the production credentials and is idempotent: creates/alters tables (never drops), seeds samples into
  an empty DB, applies `IMPORTS` once (tracked in `data_imports`), runs one-off steps (publish the
  Metropolis churches, delete probe accounts), and copies any hotlinked photo into Blob.
  **This is the way to change production data** — the Turso URL/token are "Sensitive" in Vercel and
  cannot be pulled locally, and Blob OIDC only works from the production environment.
- **Turso:** integration resource `database-canary-mountain`. It originally created a *new empty database
  per deployment* (host `dpl-<id>-vercel-…turso.io`) — data was lost on every deploy. The owner changed
  the connection so Production uses the main DB; verified persistent (redeploy found data unchanged).
  Turso is now connected to **Production only** → preview deployments fail at migrate (expected) until a
  separate preview DB is connected. Work on `main` only.
- **Blob:** store `store_ikfun1aBVL8Y…`, **private access**, OIDC auth (`BLOB_STORE_ID`, no read-write
  token). Uploads auto-detect private stores (`lib/storage.ts`, `scripts/lib.mjs`) and are served via
  `app/media/[...path]` (`/media/photos/...`, immutable, CDN-cached). Locally photos go to `./uploads`
  (served by `app/uploads/[name]`).
- Vercel CLI is logged in on the dev machine; project linked (`.vercel/`, gitignored). Useful:
  `npx vercel@65.3.1 ls kyprosgiagion --scope has-no-friends`,
  `npx vercel@65.3.1 inspect <deployment-url> --logs --scope has-no-friends` (shows migrate output),
  `npx vercel@65.3.1 env ls --scope has-no-friends`.
- After a push, the production alias can take a few minutes to switch to the new deployment.

### Environment variables (Vercel)
| Variable | Status |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | set by integration (Production only) |
| `BLOB_STORE_ID` (+ OIDC) | set by Blob integration |
| `SESSION_SECRET` | set (used as Better Auth secret; `BETTER_AUTH_SECRET` optional) |
| `SUPERADMIN_EMAILS` | set: `nmf@hnf.sh` (Production + Preview) |
| `RESEND_API_KEY`, `EMAIL_FROM` | **not set — deliberately postponed** until the "real" production environment |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | **not set yet** (CAPTCHA disabled until then) |
| `ADMIN_PASSWORD` | leftover from the old Express app, unused |

Local dev: `.env.local` has `BETTER_AUTH_SECRET`, `SUPERADMIN_EMAILS=super@example.test`, and a
`VERCEL_OIDC_TOKEN` added by `vercel env pull`. Do **not** keep a `.env.production.local` with
`[SENSITIVE]` placeholders — Next loads it for local production builds and the build fails.

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
- Commit messages end with `Co-Authored-By: Claude …`; push to `main` deploys.

## 7. Known issues / gotchas

- Pins overlap in Famagusta town (no clustering yet).
- Local photos for the 31 imported churches live in `./uploads` (gitignored); production has its own in Blob.
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

**Next session — start here (owner's choice): items 2, 4 and 5 below.**

1. **Backups**: nightly export of the DB (+ Blob inventory) and a tested restore. Production has no backups yet —
   do this before contributors grow.
2. **Image performance** ← next: resized variants on upload (thumbnail / medium / full) + a one-off migrate step that
   creates them for existing photos; use the thumbnails in the map list, gallery and cards (they currently load
   full images, ~400 KB each).
3. **Feast days / panigyria**: patron saint + feast day per church (+ century, current state: in use / ruined /
   occupied) as structured fields and map filters. Tie into name days: "Πανηγυρίζουν σήμερα" in the name-day bar
   and `/eortologio`, "celebrating this week" map filter, feast-day countdown on church pages, new mission for points.
4. **SEO / sharing** ← next: per-church OG images (photo + name, for Facebook/WhatsApp previews), sitemap,
   proper EL/EN URLs with hreflang, schema.org markup (Church / Place).
5. **Pin clustering + "nearby churches"** ← next: cluster pins when zoomed out (Famagusta town overlaps), list the
   closest churches on each church page.
6. **More content**: more regions + region management in the admin; importers from the Metropolis parish lists
   (Constantia ~89, Paphos ~114, Tamassos ~50, Kition 46, Limassol/Amathus, Morphou, Trimythous) or the Church's
   2024 PDF (strip clergy/committee names and phones). The 31 imported churches still have placeholder history.
7. Change history / undo (audit log of edits and approvals).
8. Contributor e-mails (approved/rejected, points) — after Resend.
9. English translations of the Metropolis histories (only Greek was imported).
Smaller: privacy policy (accounts = personal data), Vercel Analytics, error monitoring, separate preview DB,
monthly leaderboard, public contributor profiles.

**Decided by the owner (2026-10-27):**
- Karpasia assignment confirmed: the 8 Karpasia churches (Trikomo included) belong to the Bishopric of Karpasia.
- Permission for the Metropolis history texts: yes — the project is a demo for the Church of Cyprus.
- Priority: polish what's already there until the owner is happy with it, then continue with the roadmap.

**Owner will look at later** (don't act on these unprompted): which see Panagia Kantariotissa belongs to;
Turnstile keys + custom domain; Resend.
