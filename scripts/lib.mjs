// Shared helpers for the command-line scripts (the app itself uses lib/*.ts).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { sized } from '../lib/photo-sizes.mjs';
import { makeVariants } from '../lib/photo-variants.mjs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The database selected by the environment: DATABASE_URL if set (the server's /data/app.db), else data/app.db. */
export function openDb() {
  const url = process.env.DATABASE_URL || `file:${path.join(ROOT, 'data', 'app.db')}`;
  return { url, db: createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }) };
}

export async function rows(db, sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}

const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

export const isStored = (src) => src.startsWith('/uploads/') || src.startsWith('/media/');

function storeFile(name, data) {
  fs.mkdirSync(path.join(ROOT, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'uploads', name), data);
  return `/uploads/${name}`;
}

/** Stores an image and its smaller copies in ./uploads. Returns its URL. */
export async function storePhoto(baseName, data, contentType) {
  const ext = TYPES[contentType];
  if (!ext) throw new Error(`unsupported image type ${contentType}`);
  const src = await storeFile(`${baseName.slice(0, 60)}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`, data);
  await storeVariants(src, data).catch((e) => console.warn(`photo copies failed: ${e.message}`));
  return src;
}

/** Makes and stores the smaller copies (lib/photo-sizes.mjs) of a stored photo. */
export async function storeVariants(src, data) {
  for (const v of await makeVariants(data)) storeFile(path.basename(sized(src, v.size)), v.data);
}

/** Reads a stored photo's bytes (./uploads; /media/photos/x is the same file as /uploads/x), or downloads a URL. */
export async function readStored(src) {
  if (isStored(src)) return fs.readFileSync(path.join(ROOT, 'uploads', path.basename(src)));
  const res = await fetch(src, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${src}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Downloads an image from another site and stores our own copy (no hotlinking). */
export async function rehost(url, baseName) {
  const res = await fetch(url, { headers: { 'User-Agent': 'kyprosagiongi/1.0 (heritage map)' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  let type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!TYPES[type] && /\.jpe?g($|\?)/i.test(url)) type = 'image/jpeg';
  return storePhoto(baseName, Buffer.from(await res.arrayBuffer()), type);
}
