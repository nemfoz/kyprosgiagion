import "server-only"
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { put, del } from "@vercel/blob"

// Photos live in Vercel Blob in production and in ./uploads (served by app/uploads/[name]) locally.
// We never hotlink: images from other sites are downloaded and stored here first.

// A read-write token, or the store id with Vercel's OIDC login (how newly connected Blob stores authenticate).
const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
const UPLOADS = path.join(process.cwd(), "uploads")

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
}

export function isStored(src: string) {
  return src.startsWith("/uploads/") || /\.blob\.vercel-storage\.com\//.test(src)
}

export async function storePhoto(baseName: string, data: Buffer, contentType: string) {
  const ext = IMAGE_TYPES[contentType]
  if (!ext) throw new Error("Μη υποστηριζόμενος τύπος εικόνας")
  const name = `${baseName.slice(0, 60)}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}${ext}`
  if (USE_BLOB) return (await put(`photos/${name}`, data, { access: "public", contentType })).url
  await fs.mkdir(UPLOADS, { recursive: true })
  await fs.writeFile(path.join(UPLOADS, name), data)
  return `/uploads/${name}`
}

const MAX_BYTES = 15 * 1024 * 1024

// Refuse local/private addresses so the importer can't be used to reach internal services.
function assertPublicUrl(raw: string) {
  const u = new URL(raw)
  const h = u.hostname.toLowerCase()
  if (!/^https?:$/.test(u.protocol)) throw new Error("Μόνο διευθύνσεις http/https.")
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^\[|^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) || /^\d+$/.test(h)) {
    throw new Error("Μη επιτρεπτή διεύθυνση.")
  }
}

/** Downloads an image from another website and stores our own copy. */
export async function rehostImage(url: string, baseName: string) {
  assertPublicUrl(url)
  const res = await fetch(url, { headers: { "User-Agent": "kyprosagiongi/1.0 (heritage map)" }, signal: AbortSignal.timeout(20000) })
  assertPublicUrl(res.url || url) // after redirects
  if (!res.ok) throw new Error(`Λήψη εικόνας απέτυχε (${res.status})`)
  const type = (res.headers.get("content-type") || "").split(";")[0].trim()
  if (!IMAGE_TYPES[type]) throw new Error(`Δεν είναι εικόνα: ${type || "άγνωστος τύπος"}`)
  const data = Buffer.from(await res.arrayBuffer())
  if (data.length > MAX_BYTES) throw new Error("Η εικόνα είναι πολύ μεγάλη (μέγιστο 15 MB).")
  return storePhoto(baseName, data, type)
}

export async function deleteStored(src: string) {
  if (src.startsWith("/uploads/")) {
    await fs.rm(path.join(UPLOADS, path.basename(src)), { force: true })
  } else if (USE_BLOB && /\.blob\.vercel-storage\.com\//.test(src)) {
    await del(src).catch((e) => console.warn("blob delete failed:", e.message))
  }
}
