import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, del } from '@vercel/blob';
import {
  SITE_TYPES, regionsConfig, listSites, getSite, saveSite, deleteSite,
  addPhoto, getPhoto, updatePhoto, deletePhoto,
} from './lib/db.js';
import { renderSitePage, esc } from './lib/render.js';
import { slugify } from './lib/slug.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(ROOT, 'uploads');
const PORT = Number(process.env.PORT) || 3000;
const ON_VERCEL = !!process.env.VERCEL;
if (ON_VERCEL && (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET)) {
  throw new Error('Set ADMIN_PASSWORD and SESSION_SECRET in the Vercel project environment variables.');
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
if (!process.env.ADMIN_PASSWORD) console.warn('⚠  ADMIN_PASSWORD not set – using "admin". Set it before deploying.');

// ---- sessions: HMAC-signed cookie, no server state ----------------------

const secretFile = path.join(ROOT, 'data', '.secret');
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

async function handleSave(req, res, id) {
  const { errors, data } = validateSite(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  try {
    const savedId = await saveSite(data, id);
    res.json(await getSite({ id: savedId }));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: `slug "${data.slug}" is already used` });
    throw e;
  }
}

// ---- app -----------------------------------------------------------------

// Express 4 does not catch rejected promises from async handlers.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- photo storage: Vercel Blob when configured, local uploads/ folder otherwise ----

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

async function storePhoto(name, buffer, contentType) {
  if (USE_BLOB) return (await put(`photos/${name}`, buffer, { access: 'public', contentType })).url;
  fs.writeFileSync(path.join(UPLOADS, name), buffer);
  return `/uploads/${name}`;
}

async function removeStoredPhoto(photo) {
  if (photo.src.startsWith('/uploads/')) {
    fs.rm(path.join(UPLOADS, path.basename(photo.src)), { force: true }, () => {});
  } else if (USE_BLOB && /\.blob\.vercel-storage\.com\//.test(photo.src)) {
    await del(photo.src).catch((e) => console.warn('blob delete failed:', e.message));
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));

const pickLang = (req) => (req.query.lang === 'en' ? 'en' : 'el');

// Public API
app.get('/api/config', (req, res) => res.json(regionsConfig));

app.get('/api/sites', h(async (req, res) => {
  const sites = await listSites({ publishedOnly: true, region: req.query.region || undefined });
  res.json(sites.map(({ id, slug, type, region, lat, lng, coords_verified, cover, content }) => ({
    id, slug, type, region, lat, lng, coords_verified, cover,
    name: { el: content.el.name, en: content.en.name },
    location: { el: content.el.location, en: content.en.location },
    summary: { el: content.el.summary, en: content.en.summary },
  })));
}));

// Dedicated site page (server rendered so it can be shared and indexed)
app.get('/site/:slug', h(async (req, res) => {
  const site = await getSite({ slug: req.params.slug });
  const admin = isAdmin(req);
  if (!site || (!site.published && !admin)) {
    return res.status(404).send(`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
      <main class="notfound"><h1>404</h1><p>${esc(req.params.slug)}</p><a href="/">← Χάρτης / Map</a></main>`);
  }
  res.send(renderSitePage(site, { lang: pickLang(req), isAdmin: admin }));
}));

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

admin.get('/sites', h(async (req, res) => {
  res.json((await listSites({ publishedOnly: false })).map(({ content, ...s }) => ({
    ...s, name: { el: content.el.name, en: content.en.name },
  })));
}));
admin.get('/sites/:id', h(async (req, res) => {
  const site = await getSite({ id: Number(req.params.id) });
  site ? res.json(site) : res.status(404).json({ error: 'not found' });
}));
admin.post('/sites', h((req, res) => handleSave(req, res)));
admin.put('/sites/:id', h(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await getSite({ id }))) return res.status(404).json({ error: 'not found' });
  await handleSave(req, res, id);
}));
admin.delete('/sites/:id', h(async (req, res) => {
  const site = await getSite({ id: Number(req.params.id) });
  if (!site) return res.status(404).json({ error: 'not found' });
  await Promise.all(site.photos.map(removeStoredPhoto));
  await deleteSite(site.id);
  res.json({ ok: true });
}));

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

// Photo upload: the raw file is the request body (Content-Type = image type).
// The admin resizes photos in the browser first; Vercel caps request bodies at 4.5 MB.
admin.post('/sites/:id/photos/upload', express.raw({ type: Object.keys(IMAGE_TYPES), limit: '4.4mb' }), h(async (req, res) => {
  const site = await getSite({ id: Number(req.params.id) });
  if (!site) return res.status(404).json({ error: 'not found' });
  const ext = IMAGE_TYPES[req.headers['content-type']];
  if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'send a JPEG, PNG, WebP or GIF image' });
  const name = `${site.slug}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`;
  const src = await storePhoto(name, req.body, req.headers['content-type']);
  let credit = '';
  try { credit = decodeURIComponent(String(req.headers['x-credit'] || '')); } catch {}
  res.json(await addPhoto(site.id, { src, credit }));
}));

// Photo by external URL
admin.post('/sites/:id/photos', h(async (req, res) => {
  const site = await getSite({ id: Number(req.params.id) });
  if (!site) return res.status(404).json({ error: 'not found' });
  const src = String(req.body?.src || '');
  if (!/^https?:\/\//.test(src)) return res.status(400).json({ error: 'src must be an http(s) URL' });
  res.json(await addPhoto(site.id, req.body));
}));

admin.put('/photos/:id', h(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await getPhoto(id))) return res.status(404).json({ error: 'not found' });
  res.json(await updatePhoto(id, req.body || {}));
}));
admin.delete('/photos/:id', h(async (req, res) => {
  const photo = await getPhoto(Number(req.params.id));
  if (!photo) return res.status(404).json({ error: 'not found' });
  await removeStoredPhoto(photo);
  await deletePhoto(photo.id);
  res.json({ ok: true });
}));

app.use('/api/admin', admin);

// Static files (on Vercel, public/ is served by the CDN before requests reach this app)
app.use('/uploads', express.static(UPLOADS, { maxAge: '30d' }));
app.use(express.static(path.join(ROOT, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'server error' });
});

export default app;

if (!ON_VERCEL) {
  app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin/)`));
}
