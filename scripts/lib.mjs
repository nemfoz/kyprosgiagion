// Shared helpers for the command-line scripts (the app itself uses lib/*.ts).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The database selected by the environment: Turso if TURSO_DATABASE_URL is set, else data/app.db. */
export function openDb() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || `file:${path.join(ROOT, 'data', 'app.db')}`;
  return { url, db: createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN }) };
}

export async function rows(db, sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}

const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

// A read-write token, or the store id with Vercel's OIDC login.
export const hasBlobStorage = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export const isStored = (src) => src.startsWith('/uploads/') || /\.blob\.vercel-storage\.com\//.test(src);

/** Stores an image in Vercel Blob (if BLOB_READ_WRITE_TOKEN is set) or in ./uploads. Returns its URL. */
export async function storePhoto(baseName, data, contentType) {
  const ext = TYPES[contentType];
  if (!ext) throw new Error(`unsupported image type ${contentType}`);
  const name = `${baseName.slice(0, 60)}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`;
  if (hasBlobStorage()) return (await put(`photos/${name}`, data, { access: 'public', contentType })).url;
  fs.mkdirSync(path.join(ROOT, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'uploads', name), data);
  return `/uploads/${name}`;
}

/** Downloads an image from another site and stores our own copy (no hotlinking). */
export async function rehost(url, baseName) {
  const res = await fetch(url, { headers: { 'User-Agent': 'kyprosagiongi/1.0 (heritage map)' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  let type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!TYPES[type] && /\.jpe?g($|\?)/i.test(url)) type = 'image/jpeg';
  return storePhoto(baseName, Buffer.from(await res.arrayBuffer()), type);
}

/** Uploads a locally stored photo (/uploads/…) to Blob; other URLs are returned unchanged. */
export async function uploadLocal(src) {
  if (!src.startsWith('/uploads/')) return src;
  if (!hasBlobStorage()) throw new Error('Blob credentials (BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID) are needed to upload local photos.');
  const file = path.join(ROOT, 'uploads', path.basename(src));
  const type = Object.entries(TYPES).find(([, ext]) => file.toLowerCase().endsWith(ext) || (ext === '.jpg' && file.toLowerCase().endsWith('.jpeg')))?.[0];
  return (await put(`photos/${path.basename(file)}`, fs.readFileSync(file), { access: 'public', contentType: type })).url;
}
