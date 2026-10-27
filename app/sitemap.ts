import type { MetadataRoute } from "next"
import { listSites } from "@/lib/sites"
import { listMetropolises } from "@/lib/metropolises"
import { langUrl, SITE_URL } from "@/lib/seo"

export const revalidate = 3600 // new churches appear within the hour

// Every public page in both languages (Greek is the plain URL, English adds ?lang=en).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sites, metros] = await Promise.all([listSites({ publishedOnly: true }), listMetropolises()])
  const entry = (path: string, lastModified?: string, priority = 0.5): MetadataRoute.Sitemap =>
    (["el", "en"] as const).map((lang) => ({
      url: SITE_URL + langUrl(path, lang),
      lastModified: lastModified ? new Date(lastModified.replace(" ", "T") + "Z") : undefined,
      priority,
      alternates: { languages: { el: SITE_URL + path, en: SITE_URL + langUrl(path, "en") } },
    }))
  return [
    entry("/", undefined, 1),
    sites.map((s) => entry(`/site/${s.slug}`, s.updatedAt, 0.8)),
    entry("/metropolis", undefined, 0.6),
    metros.map((m) => entry(`/metropolis/${m.slug}`)),
    entry("/eortologio", undefined, 0.6),
    entry("/contribute", undefined, 0.4),
  ].flat(2)
}
