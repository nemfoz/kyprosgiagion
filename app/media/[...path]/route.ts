import fs from "node:fs/promises"
import path from "node:path"
import { get } from "@vercel/blob"
import { originalBase } from "@/lib/photo-sizes.mjs"

const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }

// Without Blob (the self-hosted server), /media/photos/x is read from ./uploads/x: old addresses keep working.
const readLocal = (pathname: string) => fs.readFile(path.join(process.cwd(), "uploads", path.basename(pathname)))
  .then((data) => ({ stream: new Blob([new Uint8Array(data)]).stream(), blob: { contentType: TYPES[path.extname(pathname).toLowerCase()] } }), () => null)

const fetchBlob = (pathname: string) => USE_BLOB
  ? get(pathname, { access: "private" }).then((b) => (b?.stream ? b : null), () => null)
  : readLocal(pathname)

// Serves photos from a private Vercel Blob store. Responses are immutable, so Vercel's CDN caches them.
// A smaller copy that doesn't exist (yet) falls back to the original, cached only briefly.
export async function GET(_req: Request, { params }: RouteContext<"/media/[...path]">) {
  const pathname = (await params).path.join("/")
  if (!pathname.startsWith("photos/") || pathname.includes("..")) return new Response("Not found", { status: 404 })
  let blob = await fetchBlob(pathname)
  let maxAge = 31536000
  const base = originalBase(pathname)
  if (!blob && base) {
    for (const ext of [".jpg", ".png", ".webp", ".gif", ".jpeg"]) if ((blob = await fetchBlob(base + ext))) break
    maxAge = 300
  }
  if (!blob?.stream) return new Response("Not found", { status: 404 })
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Cache-Control": `public, max-age=${maxAge}${maxAge > 300 ? ", immutable" : ""}`,
    },
  })
}
