# Project status & handover — Κύπρος – Αγίων Γη

_Last updated: 2026-10-27. Read this first when continuing work in a new session._

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
3D terrain (Mapterhorn DEM, Esri satellite, Natural Earth coastline, OSM district outlines) · next-themes.

Next.js 16 note: **read `node_modules/next/dist/docs/` before writing Next code** (see `AGENTS.md`).
Request APIs are async-only (`await params`, `await searchParams`, `await headers()`); `middleware` is
now `proxy` (not used here); use `PageProps<"/route">` / `RouteContext<…>` type helpers (`npx next typegen`).

## 2. What exists (features)

**Public**
- `/` 3D map (MapLibre): region tabs (Famagusta District / Karpasia), list with search and type filters,
  fly-to on select, 3D/2D and Map/Satellite toggles, district mask (rest of Cyprus faded),
  Greek/English toggle (`?lang=en`), completeness bar per church in the side panel.
- `/site/[slug]` church page: hero photo, history (simple Markdown), details, gallery with lightbox,
  sources (links always show their destination domain), 3D mini-map, Google Maps link, completeness card.
- `/contribute` gamification page: overall map completeness, "missions" (filterable, least complete first),
  leaderboard (first name + last initial), points per mission, titles and badges.
- Light theme by default; dark theme toggle (sun/moon) in every header, remembered per visitor.
- Design: "atlas" look from the owner's own commit — green palette (#385846 accent), arched thumbnails,
  intro panel, map caption. Fonts Noto Serif/Sans (Greek).

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

**Admin** (`/admin`, Greek UI)
- Overview with personal progress (title, points, rank, badges, suggested missions).
- `/admin/sites` list + editor (`components/admin/site-form.tsx`): bilingual tabs, satellite location
  picker, photo manager (upload with browser-side resize to ≤2400px; import by URL = copied, never
  hotlinked; captions, credit, source link, order), live completeness bar and points estimate.
  Users get the same form in "propose" mode.
- `/admin/submissions` queue + review page (diff, points estimate, verify location, publish).
- `/admin/users` (admins: proposal rights; superadmin: roles/ban/delete/create/confirm e-mail).

**Gamification** (`lib/completeness.ts`, `lib/contributors.ts`)
- 9 missions per church: history EL (30), history EN (20), summary both langs (10), photo (15),
  3+ photos (10), verified location (15), facts ≥3 (10), sources ≥2 (10), English name/location (5).
  Placeholder text ("θα συμπληρωθεί", "will be added", "Δείγμα κειμένου") doesn't count.
- Approved proposal = 5 points + points of missions it newly completed (stored in `submissions.points`,
  `submissions.completed`). Admin direct edits earn nothing.
- Titles: Προσκυνητής 0 → Αναγνώστης 50 → Χρονογράφος 150 → Λόγιος 400 → Φύλακας της μνήμης 1000.
  Badges: first, historian, photographer, explorer, scholar, translator (3 missions each), devoted (10).

## 3. Data & content

- Tables: `sites`, `photos` (with `source_url`), `submissions`, Better Auth `user`/`session`/`account`/
  `verification`, `rate_limit`, `data_imports`. Defined twice — keep in sync:
  `scripts/schema.mjs` (SQL, created by migrate) and `lib/db/schema.ts` (Drizzle). snake_case columns.
- Content per site is a JSON blob `{el:{name,location,summary,body,facts,sources}, en:{…}}`.
- Live data: **40 published churches** = 9 samples (Panagia Theotokos Trikomo has the full text from
  `test.html`; 8 Karpasia drafts with approximate coords) + 31 occupied parishes from the Metropolis
  website (`data/imports/imconstantias-occupied.json`, scraped by `scripts/fetch-imconstantias.mjs`;
  27 exact Google-Maps pins, 4 approximate: Arnadi, Pigi, Syngrasis, Kato Deryneia; Ayios Georgios
  Salaminos skipped — no location). Photos permitted by the Metropolis; credit + source link shown.
  Committee member names/phones on their pages were deliberately NOT imported.
- Map completeness is ~31%; the 31 imported churches have placeholder history.

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

- Greek first, English second; admin UI Greek only.
- **No hotlinks**: every image is stored in our storage; the original page is kept as a visible source link.
- Links in texts always show their destination domain.
- Default map shows no third-party place names or borders (own outlines + labels); rest of Cyprus faded.
- Light theme default; dark is opt-in.
- Missing information is shown to everyone as a challenge (gamification), not hidden.
- Resend/e-mail postponed until moving to the real production environment.
- Commit messages end with `Co-Authored-By: Claude …`; push to `main` deploys.

## 7. Known issues / gotchas

- Dev-only warning from next-themes ("Encountered a script tag…") with React 19 — harmless.
- Pins overlap in Famagusta town (no clustering yet).
- Local photos for the 31 imported churches live in `./uploads` (gitignored); production has its own in Blob.
- `scripts/fetch-imconstantias.mjs` depends on the Metropolis site's Elementor markup; re-check if it changes.
- Drizzle renders `${sites.id}` unqualified inside raw `sql` subqueries — write `"sites"."id"` explicitly.

## 8. Next steps (agreed list, in suggested order)

1. ~~Finish setup~~ → Turnstile keys (+ custom domain); Resend later.
2. Backups: nightly export of DB (+ Blob inventory) and a tested restore.
3. Change history / undo (audit log of edits and approvals).
4. ~~Missing-content list~~ → done as gamification (`/contribute`).
5. Image performance: resized variants/thumbnails (thumbnails currently load full images, ~400 KB).
6. Pin clustering + "nearby churches" on site pages.
7. Richer structured fields (patron saint/feast day, century, current state, looted icons…) + filters.
8. SEO/sharing: sitemap, per-church OG images, hreflang EL/EN routes, schema.org markup.
9. Contributor e-mails (approved/rejected, points) — after Resend.
10. More regions (Kyrenia etc.) + region management in the admin; more importers.
Smaller: privacy policy (accounts = personal data), Vercel Analytics, error monitoring, separate preview DB,
monthly leaderboard, public contributor profiles.
