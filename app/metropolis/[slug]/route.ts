import { editionPaths } from "@/lib/editions"
import { isLocale, localePath } from "@/lib/locales"
import { getMetropolis } from "@/lib/metropolises"

// /metropolis/<slug> (old links from before the editions, and admin links): the see's page in its own edition.
export async function GET(req: Request, { params }: RouteContext<"/metropolis/[slug]">) {
  const { slug } = await params
  const lang = new URL(req.url).searchParams.get("lang")
  const m = await getMetropolis({ slug: decodeURIComponent(slug) })
  if (!m) return new Response("Not found", { status: 404 })
  const to = localePath(editionPaths(m.edition).metropolis(m.slug), isLocale(lang) ? lang : "el")
  return Response.redirect(new URL(to, req.url), 308)
}
