import type { MetadataRoute } from "next"
import { editionPaths, sitePath } from "@/lib/editions"
import { getEditions } from "@/lib/editions-server"
import { INFO_PAGES } from "@/lib/pages"
import { LOCALES, localePath, type Locale } from "@/lib/locales"
import { siteSummaries } from "@/lib/sites"
import { publicMetropolises } from "@/lib/metropolises"
import { SITE_URL } from "@/lib/seo"

// Built per request from the cached church list (so it never shows the Docker build's sample data).
export const dynamic = "force-dynamic"

// Every public page in each of its languages. Church pages are listed only in the languages they have
// been translated into (Greek and English always); untranslated versions just show the English text.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [all, allMetros, editions] = await Promise.all([siteSummaries(), publicMetropolises(), getEditions()])
  // Only the public editions (an edition being prepared stays out of search engines).
  const open = new Set(editions.filter((e) => e.active).map((e) => e.id))
  const sites = all.filter((s) => open.has(s.edition))
  const metros = allMetros.filter((m) => open.has(m.edition))
  const entry = (path: string, opts: { lastModified?: string; priority?: number; locales?: readonly Locale[] } = {}): MetadataRoute.Sitemap => {
    const locales = opts.locales ?? LOCALES
    const languages = Object.fromEntries(locales.map((l) => [l, SITE_URL + localePath(path, l)]))
    return locales.map((l) => ({
      url: SITE_URL + localePath(path, l),
      lastModified: opts.lastModified ? new Date(opts.lastModified.replace(" ", "T") + "Z") : undefined,
      priority: opts.priority ?? 0.5,
      alternates: { languages },
    }))
  }
  return [
    entry("/", { priority: 1 }),
    [...open].map((id) => [entry(editionPaths(id).home, { priority: 0.9 }), entry(editionPaths(id).map, { priority: 0.9 })]),
    sites.map((s) => entry(sitePath(s), { lastModified: s.updatedAt, priority: 0.8, locales: ["el", "en", ...s.locales] })),
    [...open].filter((id) => metros.some((m) => m.edition === id)).map((id) => entry(editionPaths(id).metropolises, { priority: 0.6 })),
    metros.map((m) => entry(editionPaths(m.edition).metropolis(m.slug))),
    entry("/eortologio", { priority: 0.6 }),
    entry("/contribute", { priority: 0.4 }),
    INFO_PAGES.map((p) => entry(`/${p}`, { priority: 0.2 })),
  ].flat(3)
}
