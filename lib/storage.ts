import "server-only"
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { del, put } from "@vercel/blob"
import { UserError } from "@/lib/session"
import { sized } from "@/lib/photo-sizes.mjs"
import { makeVariants } from "@/lib/photo-variants.mjs"

// Photos live in Vercel Blob in production and in ./uploads (served by app/uploads/[name]) locally.
// We never hotlink: images from other sites are downloaded and stored here first.

// A read-write token, or the store id with Vercel's OIDC login (how newly connected Blob stores authenticate).
const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
const UPLOADS = path.join(process.cwd(), "uploads")

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
}

export function isStored(src: string) {
  return src.startsWith("/uploads/") || src.startsWith("/media/") || /\.blob\.vercel-storage\.com\//.test(src)
}

// Public stores give a CDN URL; private stores are served through our /media route (app/media/[...path]).
let blobAccess: "public" | "private" = process.env.BLOB_ACCESS === "private" ? "private" : "public"

async function putBlob(pathname: string, data: Buffer, contentType: string) {
  try {
    const r = await put(pathname, data, { access: blobAccess, contentType })
    return blobAccess === "public" ? r.url : `/media/${r.pathname}`
  } catch (e) {
    if (blobAccess === "public" && /private store/i.test((e as Error).message)) {
      blobAccess = "private"
      return putBlob(pathname, data, contentType)
    }
    throw e
  }
}

async function storeFile(name: string, data: Buffer, contentType: string) {
  if (USE_BLOB) return putBlob(`photos/${name}`, data, contentType)
  await fs.mkdir(UPLOADS, { recursive: true })
  await fs.writeFile(path.join(UPLOADS, name), data)
  return `/uploads/${name}`
}

/** Stores a photo and its smaller copies (lib/photo-sizes.mjs). Returns the original's URL. */
export async function storePhoto(baseName: string, data: Buffer, contentType: string) {
  const ext = IMAGE_TYPES[contentType]
  if (!ext) throw new UserError("error.image.unsupported")
  const stem = `${baseName.slice(0, 60)}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`
  const src = await storeFile(stem + ext, data, contentType)
  // A failed copy isn't fatal: the original is served in its place.
  await makeVariants(data)
    .then((list) => Promise.all(list.map((v) => storeFile(`${stem}.${v.size}.webp`, v.data, "image/webp"))))
    .catch((e) => console.warn("photo copies failed:", (e as Error).message))
  return src
}

const MAX_BYTES = 15 * 1024 * 1024

// Refuse local/private addresses so the importer can't be used to reach internal services.
function assertPublicUrl(raw: string) {
  const u = new URL(raw)
  const h = u.hostname.toLowerCase()
  if (!/^https?:$/.test(u.protocol)) throw new UserError("error.image.httpOnly")
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^\[|^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) || /^\d+$/.test(h)) {
    throw new UserError("error.image.forbiddenAddress")
  }
}

/** Downloads an image from another website and stores our own copy. */
export async function rehostImage(url: string, baseName: string) {
  assertPublicUrl(url)
  const res = await fetch(url, { headers: { "User-Agent": "kyprosagiongi/1.0 (heritage map)" }, signal: AbortSignal.timeout(20000) })
  assertPublicUrl(res.url || url) // after redirects
  if (!res.ok) throw new UserError("error.image.downloadFailed", { status: res.status })
  const type = (res.headers.get("content-type") || "").split(";")[0].trim()
  if (!IMAGE_TYPES[type]) throw new UserError("error.image.notImage", { type: type || "?" })
  const data = Buffer.from(await res.arrayBuffer())
  if (data.length > MAX_BYTES) throw new UserError("error.image.tooLarge15")
  return storePhoto(baseName, data, type)
}

export async function deleteStored(src: string) {
  await Promise.all([src, sized(src, "sm"), sized(src, "md")].filter((u, i, all) => all.indexOf(u) === i).map(deleteOne))
}

async function deleteOne(src: string) {
  if (src.startsWith("/uploads/")) {
    await fs.rm(path.join(UPLOADS, path.basename(src)), { force: true })
  } else if (USE_BLOB && (src.startsWith("/media/") || /\.blob\.vercel-storage\.com\//.test(src))) {
    await del(src.startsWith("/media/") ? src.slice("/media/".length) : src).catch((e) => console.warn("blob delete failed:", e.message))
  }
}
