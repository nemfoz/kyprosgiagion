import { get } from "@vercel/blob"
import { originalBase } from "@/lib/photo-sizes.mjs"

const fetchBlob = (pathname: string) => get(pathname, { access: "private" }).then((b) => (b?.stream ? b : null), () => null)

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
