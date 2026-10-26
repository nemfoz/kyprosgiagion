import fs from "node:fs/promises"
import path from "node:path"
import { IMAGE_TYPES } from "@/lib/storage"

// Serves photos stored locally (development). In production photos are in Vercel Blob.
const TYPES = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([type, ext]) => [ext, type]))

export async function GET(_req: Request, { params }: RouteContext<"/uploads/[name]">) {
  const name = path.basename((await params).name)
  const type = TYPES[path.extname(name).toLowerCase()]
  if (!type) return new Response("Not found", { status: 404 })
  try {
    const data = await fs.readFile(path.join(process.cwd(), "uploads", name))
    return new Response(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
