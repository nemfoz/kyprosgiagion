# Οδοιπορικό / Odoiporiko

A pilgrim's atlas of Orthodox churches: maps of the churches and monasteries of each local Orthodox Church, with
their history, photographs and sources. The first edition is **Κύπρος – Αγίων Γη / Cyprus – Land of Saints**
(Famagusta District and the Karpasia peninsula). An El Frank Foundation project, built by hnf.sh.

**Stack:** Next.js 16 (App Router) · Tailwind CSS 4 · shadcn/ui · Better Auth · Drizzle ORM on libSQL
(local SQLite file / Turso) · Vercel Blob · MapLibre GL (3D terrain).

## Run locally

```bash
npm install
cp .env.example .env.local      # set BETTER_AUTH_SECRET and SUPERADMIN_EMAILS (your e-mail)
npm run migrate                 # creates data/app.db with the sample churches
npm run rehost-photos           # copies the sample photos into ./uploads
npm run dev                     # http://localhost:3000  ·  sign up at /signup with a SUPERADMIN_EMAILS address
```

## Roles

| Role | Can |
|---|---|
| **Χρήστης** (user) | Signs up at `/signup` and confirms their e-mail address; the account is then active. Proposes new churches and changes (texts, location, photos), which wait in a queue. |
| **Διαχειριστής** (admin) | Edits and publishes directly, reviews proposals (field-by-field comparison), can take away a user's right to propose. |
| **Υπερδιαχειριστής** (superadmin) | Everything an admin can do, plus user management: roles, new accounts/admins, blocking, deleting, confirming an e-mail by hand. |

Accounts whose e-mail is in `SUPERADMIN_EMAILS` become superadmins when they sign up (after confirming the address).

### Spam protection on sign-up

Before any account is created or e-mail is sent: Cloudflare **Turnstile** CAPTCHA (usually invisible), a hidden
**honeypot** field, a **minimum fill-in time**, a block on **throwaway e-mail domains** (`lib/antispam.ts`), and
per-IP **rate limits** stored in the database (5 sign-ups per hour, also on sign-in, password reset and re-sending
the confirmation). The account only becomes active once the e-mail link is clicked.

Roles and permissions
are defined in `lib/permissions.ts`; Better Auth's admin plugin enforces them for user management, and
`assertRole()` (`lib/session.ts`) for content actions.

## Structure

| Path | What it is |
|---|---|
| `app/page.tsx` | Home page: the brand and the choice of Church (`lib/editions.ts`; only Cyprus is open) |
| `app/cyprus/page.tsx` | The Cyprus edition's landing page (regions, sees, featured churches) |
| `app/cyprus/map/`, `components/map/` | Public 3D map (MapLibre) with list, search and filters |
| `app/cyprus/site/[slug]/`, `app/cyprus/metropolis/` | Church pages and the sees (old `/site/…`, `/metropolis/…` links redirect, `next.config.ts`) |
| `app/profile/`, `app/u/[id]/`, `lib/visits.ts` | Visited churches ("I'm here" GPS check-in or a manual mark), the user's odoiporiko, public profiles |
| `app/(info)/`, `lib/pages.ts`, `/admin/pages` | About, Contact, Privacy, Cookies, Terms (texts editable by superadmins), footer, cookie notice |
| `app/(auth)/` | Sign in / sign up |
| `app/admin/` | Dashboard: churches, proposals, users; `actions.ts` holds the server actions |
| `app/api/photos/` | Photo uploads (resized in the browser first) |
| `lib/auth.ts`, `lib/permissions.ts` | Better Auth setup and the three roles |
| `lib/db/schema.ts` | Drizzle tables — created by `scripts/migrate.mjs` from `scripts/schema.mjs` (keep both in sync) |
| `lib/sites.ts`, `lib/submissions.ts` | Church and proposal data |
| `lib/storage.ts` | Photo storage (Blob / `./uploads`) and copying images from other websites |
| `lib/photo-sizes.mjs`, `lib/photo-variants.mjs` | Smaller WebP copies of every photo (`sized(src, "sm" \| "md")`) |
| `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, `**/opengraph-image.tsx` | SEO, hreflang and share previews |
| `data/regions.json`, `public/data/*.geojson` | Regions, map labels, outlines |
| `scripts/` | migrate, sync, import, rehost-photos |

## Photos and links

Photos are never hotlinked: uploads and images from other websites are stored in our own storage
(Vercel Blob in production). The original page is kept as the photo's **source link** and shown next to it.
Links in texts and sources always show the destination website, e.g. "Μητρόπολη Κωνσταντίας (imconstantias.org.cy)".

## Self-hosting (Docker)

`Dockerfile` + `docker-compose.yml` run the app with its data in one volume (`./data` → `/data`: `app.db` and
`uploads/`). Migrations run on every start. On the server, next to `docker-compose.yml`, put a `.env`:

```bash
SITE_URL=https://odoiporiko.com          # canonical/sitemap/OG addresses (also a build argument)
APP_HOSTS=odoiporiko.com,www.odoiporiko.com,sv.hasnofriends.com   # host names accepted for sign-in
BETTER_AUTH_SECRET=…                     # random, keep it
SUPERADMIN_EMAILS=…
PORT=4002                                # published on 127.0.0.1 only; put the reverse proxy (TLS) in front
# RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY when ready
```

`docker compose up -d --build` builds and starts it. Without `RESEND_API_KEY` sign-ups are refused
(`REQUIRE_EMAIL=1`), except the first superadmin.

**Moving the data from Vercel** (once): set `EXPORT_TOKEN` on the Vercel project and deploy, then
`curl -H "Authorization: Bearer $EXPORT_TOKEN" https://kyprosgiagion.vercel.app/api/export > data/dump.json` and
`docker compose run --rm app node scripts/import-dump.mjs /data/dump.json https://kyprosgiagion.vercel.app`
(imports every table except sessions, downloads the photos into `/data/uploads`, rewrites `/media/photos/…` to
`/uploads/…`; re-running only fetches missing photos). Remove `EXPORT_TOKEN` afterwards.

## Deploying (Vercel)

Environment variables (Settings → Environment Variables), for Production **and** Preview:

| Variable | |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | from the Turso integration |
| `BLOB_READ_WRITE_TOKEN` | from the Blob store |
| `BETTER_AUTH_SECRET` | random string (`SESSION_SECRET` is used if this is missing) |
| `SUPERADMIN_EMAILS` | your e-mail(s) |
| `RESEND_API_KEY`, `EMAIL_FROM` | e-mail sending ([resend.com](https://resend.com), with a verified sender domain) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile widget (dash.cloudflare.com → Turnstile; add the site's domains) |
| `BETTER_AUTH_URL` | optional, only for a custom domain |

Every build runs `scripts/migrate.mjs` first. It adds any missing tables/columns (never drops anything), applies
the content files listed in its `IMPORTS` once per database (tracked in the `data_imports` table; churches arrive as
drafts with their photos copied into Blob), and copies any hotlinked photo into storage. This is how production data
is changed without downloading the production secrets (Vercel keeps the Turso credentials and Blob OIDC access
server-side only).

## Production data from your computer

Put the production values in `.env.production.local`, then:

| Command | |
|---|---|
| `npm run dev:prod` | Run locally against the production database and Blob |
| `npm run sync:pull` / `sync:push [-- --apply]` | Copy churches between local and production (push is a dry run without `--apply`) |
| `node --env-file=.env.production.local scripts/rehost-photos.mjs` | Copy any hotlinked photos into Blob |
| `node --env-file=.env.production.local scripts/import.mjs data/imports/imconstantias-occupied.json` | Add the Metropolis' occupied churches as drafts, with photos |

`scripts/fetch-imconstantias.mjs` re-reads the Metropolis website into `data/imports/imconstantias-occupied.json`.

## Adding a new area

1. Add its outline to `public/data/boundaries.geojson` (`properties.region = "<id>"`).
2. In `data/regions.json`, add or enable the region (`"active": true`, `"boundary"`, `"bounds"`, `"camera"`) and village labels.
