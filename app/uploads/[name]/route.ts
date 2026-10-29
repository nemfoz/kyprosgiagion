import fs from "node:fs/promises"
import path from "node:path"
import { IMAGE_TYPES } from "@/lib/storage"
import { originalBase } from "@/lib/photo-sizes.mjs"

// Serves the stored photos (./uploads; on the server the /data/uploads volume).
const TYPES = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([type, ext]) => [ext, type]))
const read = (name: string) => fs.readFile(path.join(process.cwd(), "uploads", name)).catch(() => null)

export async function GET(_req: Request, { params }: RouteContext<"/uploads/[name]">) {
  const name = path.basename((await params).name)
  if (!TYPES[path.extname(name).toLowerCase()]) return new Response("Not found", { status: 404 })
  let file = name, data = await read(name)
  // A smaller copy that doesn't exist (yet) falls back to the original.
  const base = originalBase(name)
  if (!data && base) {
    for (const ext of Object.keys(TYPES)) if ((data = await read((file = base + ext)))) break
  }
  if (!data) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": TYPES[path.extname(file).toLowerCase()], "Cache-Control": file === name ? "public, max-age=31536000, immutable" : "no-cache" },
  })
}
