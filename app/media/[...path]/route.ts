import { get } from "@vercel/blob"

// Serves photos from a private Vercel Blob store. Responses are immutable, so Vercel's CDN caches them.
export async function GET(_req: Request, { params }: RouteContext<"/media/[...path]">) {
  const pathname = (await params).path.join("/")
  if (!pathname.startsWith("photos/") || pathname.includes("..")) return new Response("Not found", { status: 404 })
  const blob = await get(pathname, { access: "private" }).catch(() => null)
  if (!blob?.stream) return new Response("Not found", { status: 404 })
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
