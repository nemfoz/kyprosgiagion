import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_DIR, SITE_TYPES, regionsConfig, listSites, getSite, saveSite, deleteSite,
  addPhoto, getPhoto, updatePhoto, deletePhoto,
} from './lib/db.js';
import { renderSitePage, esc } from './lib/render.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(ROOT, 'uploads');
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
if (!process.env.ADMIN_PASSWORD) console.warn('⚠  ADMIN_PASSWORD not set – using "admin". Set it before deploying.');

// ---- sessions: HMAC-signed cookie, no server state ----------------------

const secretFile = path.join(DATA_DIR, '.secret');
const SECRET = process.env.SESSION_SECRET || (() => {
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(secretFile, 'utf8').trim();
})();
const SESSION_DAYS = 7;

const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');

function makeSession() {
  const payload = `admin.${Date.now() + SESSION_DAYS * 864e5}`;
  return `${payload}.${sign(payload)}`;
}

function isAdmin(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)session=([^;]+)/);
  if (!m) return false;
  const [user, exp, sig] = decodeURIComponent(m[1]).split('.');
  const expected = sign(`${user}.${exp}`);
  return !!sig && sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) && Number(exp) > Date.now();
}

function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'unauthorised' });
}

// ---- validation ----------------------------------------------------------

const slugify = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function validateSite(body) {
  const errors = [];
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || lat < 34.4 || lat > 35.8) errors.push('lat must be a number within Cyprus (34.4 – 35.8)');
  if (!Number.isFinite(lng) || lng < 32.2 || lng > 34.7) errors.push('lng must be a number within Cyprus (32.2 – 34.7)');
  if (!SITE_TYPES.includes(body.type)) errors.push(`type must be one of ${SITE_TYPES.join(', ')}`);
  if (!regionsConfig.regions.some((r) => r.id === body.region)) errors.push('unknown region');
  const name = body.content?.el?.name || body.content?.en?.name;
  if (!name) errors.push('a name is required in at least one language');
  const slug = slugify(body.slug || body.content?.en?.name || '');
  if (!slug) errors.push('slug is required (latin letters, numbers and dashes)');
  return { errors, data: { ...body, lat, lng, slug } };
}

function handleSave(req, res, id) {
  const { errors, data } = validateSite(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  try {
    const savedId = saveSite(data, id);
    res.json(getSite({ id: savedId }));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: `slug "${data.slug}" is already used` });
    throw e;
  }
}

// ---- app -----------------------------------------------------------------

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

const pickLang = (req) => (req.query.lang === 'en' ? 'en' : 'el');

// Public API
app.get('/api/config', (req, res) => res.json(regionsConfig));

app.get('/api/sites', (req, res) => {
  const sites = listSites({ publishedOnly: true, region: req.query.region || undefined });
  res.json(sites.map(({ id, slug, type, region, lat, lng, coords_verified, cover, content }) => ({
    id, slug, type, region, lat, lng, coords_verified, cover,
    name: { el: content.el.name, en: content.en.name },
    location: { el: content.el.location, en: content.en.location },
    summary: { el: content.el.summary, en: content.en.summary },
  })));
});

// Dedicated site page (server rendered so it can be shared and indexed)
app.get('/site/:slug', (req, res) => {
  const site = getSite({ slug: req.params.slug });
  const admin = isAdmin(req);
  if (!site || (!site.published && !admin)) {
    return res.status(404).send(`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
      <main class="notfound"><h1>404</h1><p>${esc(req.params.slug)}</p><a href="/">← Χάρτης / Map</a></main>`);
  }
  res.send(renderSitePage(site, { lang: pickLang(req), isAdmin: admin }));
});

// Admin API
app.post('/api/admin/login', (req, res) => {
  const given = Buffer.from(String(req.body?.password ?? ''));
  const expected = Buffer.from(ADMIN_PASSWORD);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(401).json({ error: 'wrong password' });
  }
  res.setHeader('Set-Cookie', `session=${encodeURIComponent(makeSession())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${req.secure ? '; Secure' : ''}`);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => res.json({ admin: isAdmin(req) }));

const admin = express.Router();
admin.use(requireAdmin);

admin.get('/sites', (req, res) => {
  res.json(listSites({ publishedOnly: false }).map(({ content, ...s }) => ({
    ...s, name: { el: content.el.name, en: content.en.name },
  })));
});
admin.get('/sites/:id', (req, res) => {
  const site = getSite({ id: Number(req.params.id) });
  site ? res.json(site) : res.status(404).json({ error: 'not found' });
});
admin.post('/sites', (req, res) => handleSave(req, res));
admin.put('/sites/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getSite({ id })) return res.status(404).json({ error: 'not found' });
  handleSave(req, res, id);
});
admin.delete('/sites/:id', (req, res) => {
  const site = getSite({ id: Number(req.params.id) });
  if (!site) return res.status(404).json({ error: 'not found' });
  site.photos.forEach(removeUploadedFile);
  deleteSite(site.id);
  res.json({ ok: true });
});

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

// Photo upload: the raw file is the request body (Content-Type = image type).
admin.post('/sites/:id/photos/upload', express.raw({ type: Object.keys(IMAGE_TYPES), limit: '20mb' }), (req, res) => {
  const site = getSite({ id: Number(req.params.id) });
  if (!site) return res.status(404).json({ error: 'not found' });
  const ext = IMAGE_TYPES[req.headers['content-type']];
  if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'send a JPEG, PNG, WebP or GIF image' });
  const name = `${site.slug}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOADS, name), req.body);
  let credit = '';
  try { credit = decodeURIComponent(String(req.headers['x-credit'] || '')); } catch {}
  res.json(addPhoto(site.id, { src: `/uploads/${name}`, credit }));
});

// Photo by external URL
admin.post('/sites/:id/photos', (req, res) => {
  const site = getSite({ id: Number(req.params.id) });
  if (!site) return res.status(404).json({ error: 'not found' });
  const src = String(req.body?.src || '');
  if (!/^https?:\/\//.test(src)) return res.status(400).json({ error: 'src must be an http(s) URL' });
  res.json(addPhoto(site.id, req.body));
});

admin.put('/photos/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getPhoto(id)) return res.status(404).json({ error: 'not found' });
  res.json(updatePhoto(id, req.body || {}));
});
admin.delete('/photos/:id', (req, res) => {
  const photo = getPhoto(Number(req.params.id));
  if (!photo) return res.status(404).json({ error: 'not found' });
  removeUploadedFile(photo);
  deletePhoto(photo.id);
  res.json({ ok: true });
});

function removeUploadedFile(photo) {
  if (!photo.src.startsWith('/uploads/')) return;
  fs.rm(path.join(UPLOADS, path.basename(photo.src)), { force: true }, () => {});
}

app.use('/api/admin', admin);

// Static files
for (const file of ['boundaries.geojson', 'cyprus.geojson']) {
  app.get(`/data/${file}`, (req, res) => res.sendFile(path.join(DATA_DIR, file)));
}
app.use('/uploads', express.static(UPLOADS, { maxAge: '30d' }));
app.use(express.static(path.join(ROOT, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'server error' });
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin/)`));
