import { editionPaths } from "@/lib/editions"
import { isLocale, localePath } from "@/lib/locales"
import { getSite } from "@/lib/sites"
import { getRegions } from "@/lib/regions-server"

// /site/<slug> (old links from before the editions, and admin links): the church's page in its own edition.
export async function GET(req: Request, { params }: RouteContext<"/site/[slug]">) {
  const { slug } = await params
  // /en/site/x arrives rewritten by proxy.ts, with the language in x-lang (and ?lang=).
  const lang = req.headers.get("x-lang") ?? new URL(req.url).searchParams.get("lang")
  const [site, regions] = await Promise.all([getSite({ slug: decodeURIComponent(slug) }), getRegions()])
  if (!site) return new Response("Not found", { status: 404 })
  const edition = regions.find((r) => r.id === site.region)?.edition ?? "cyprus"
  const to = localePath(editionPaths(edition).site(site.slug), isLocale(lang) ? lang : "el")
  // A relative address: behind the proxy, req.url carries the container's own host.
  return new Response(null, { status: 308, headers: { Location: to } })
}
