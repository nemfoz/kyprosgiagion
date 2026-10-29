import fs from "node:fs/promises"
import path from "node:path"
import { originalBase } from "@/lib/photo-sizes.mjs"

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }

const read = (pathname: string) => fs.readFile(path.join(process.cwd(), "uploads", path.basename(pathname))).catch(() => null)

// /media/photos/x: photo addresses from the Vercel days (private Blob store), now served from ./uploads/x.
// A smaller copy that doesn't exist (yet) falls back to the original, cached only briefly.
export async function GET(_req: Request, { params }: RouteContext<"/media/[...path]">) {
  const pathname = (await params).path.join("/")
  if (!pathname.startsWith("photos/") || pathname.includes("..")) return new Response("Not found", { status: 404 })
  let file = pathname
  let data = await read(file)
  let maxAge = 31536000
  const base = originalBase(pathname)
  if (!data && base) {
    for (const ext of [".jpg", ".png", ".webp", ".gif", ".jpeg"]) if ((data = await read((file = base + ext)))) break
    maxAge = 300
  }
  if (!data) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": `public, max-age=${maxAge}${maxAge > 300 ? ", immutable" : ""}`,
    },
  })
}
