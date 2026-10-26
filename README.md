# Κύπρος – Αγίων Γη / Cyprus – Land of Saints

Map of the churches and monasteries of Cyprus, starting with Famagusta District and the Karpasia peninsula.

## Run

```bash
npm install
ADMIN_PASSWORD='choose-one' npm start      # http://localhost:3000  ·  admin: /admin/
```

Requires Node 22+. Locally the database is the SQLite file `data/app.db`, created
and filled with sample entries on first run. Run `npm run reset-db` to start again from the sample data.

## Structure

| Path | What it is |
|---|---|
| `server.js` | Express server: public API, site pages, admin API, photo uploads |
| `lib/db.js` | SQLite schema and queries (`sites`, `photos`) |
| `lib/seed.js` | Sample content (Panagia Theotokos, Trikomo, in full; the others are short drafts) |
| `lib/render.js` | Server-rendered page for each church / monastery (`/site/<slug>`) |
| `data/regions.json` | Site title, regions, and map place labels (Greek/English) |
| `public/data/*.geojson` | Region outlines (OpenStreetMap) and the Cyprus coastline (Natural Earth) |
| `public/` | Public map (`index.html`, `map.js`), site-page script, styles |
| `public/admin/` | Admin interface |
| `uploads/` | Uploaded photos (local development only) |

## Content

Every text field exists in Greek and English. The body text uses simple formatting:
blank line = new paragraph, `## Heading`, `**bold**`, `*italic*`, `[text](https://…)`, `- list`.
"Details" are written one per line as `Label: Value`.

## Adding a new area later

1. Add the area's outline to `public/data/boundaries.geojson` as a feature with `properties.region = "<id>"`.
2. In `data/regions.json`, add or enable the region (`"active": true`) with `"boundary": "<id>"` and its `bounds`,
   and add place labels for its villages.
3. Restart the server. The region appears as a tab on the map and as a choice in the admin.

## Deploying to Vercel

Vercel runs the server as serverless functions with no permanent disk, so production uses
**Turso** (hosted SQLite) for the database and **Vercel Blob** for photos. The code switches automatically
when their environment variables are present.

1. Vercel project → **Storage** → create/connect a **Blob** store (sets `BLOB_READ_WRITE_TOKEN`).
2. Vercel project → **Storage** (Marketplace) → add **Turso** and connect it
   (sets `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`; `DATABASE_URL` / `DATABASE_AUTH_TOKEN` also work).
3. Settings → **Environment Variables**: add `ADMIN_PASSWORD` and `SESSION_SECRET`
   (a long random string, e.g. `openssl rand -hex 32`). The app refuses to start on Vercel without them.
4. Redeploy. On first request the empty database is created and filled with the sample entries.

Framework preset: **Express** (auto-detected). `public/` is served by Vercel's CDN.
Photos are resized in the browser before upload (Vercel limits request bodies to 4.5 MB).

## Notes

- The public map and the site pages use **MapLibre GL with 3D terrain** (`public/terrain.js`).
  Elevation comes from Mapterhorn's open terrain tiles, satellite imagery from Esri, the coastline from
  Natural Earth. The default map draws only our own outlines, relief and Greek/English labels, so it shows
  **no third-party place names or borders**. Visitors can switch 3D/2D and Map/Satellite (their choice is remembered).
- The admin keeps a simple 2D Leaflet map for placing points precisely.
- Sample entries other than Trikomo have **approximate coordinates** (shown with a dashed marker and a
  warning). Correct them in the admin and tick "Επαληθευμένη θέση" when they are confirmed.
- Before going public: set `ADMIN_PASSWORD`, serve over HTTPS, and check the tile providers' terms of use.
