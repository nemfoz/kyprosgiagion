import type { MetadataRoute } from "next"
import { paths } from "@/lib/editions"
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
  const [sites, metros] = await Promise.all([siteSummaries(), publicMetropolises()])
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
    entry(paths.home, { priority: 0.9 }),
    entry(paths.map, { priority: 0.9 }),
    sites.map((s) => entry(paths.site(s.slug), { lastModified: s.updatedAt, priority: 0.8, locales: ["el", "en", ...s.locales] })),
    entry(paths.metropolises, { priority: 0.6 }),
    metros.map((m) => entry(paths.metropolis(m.slug))),
    entry("/eortologio", { priority: 0.6 }),
    entry("/contribute", { priority: 0.4 }),
    INFO_PAGES.map((p) => entry(`/${p}`, { priority: 0.2 })),
  ].flat(2)
}
