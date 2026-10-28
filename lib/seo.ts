import type { Metadata } from "next"
import { LOCALE_REGION, LOCALES, localePath, type Locale } from "@/lib/locales"
import { brandName } from "@/lib/editions"

// The public address: SITE_URL if set (e.g. a custom domain), else Vercel's production domain, else local dev.
export const SITE_URL = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "")

/**
 * Canonical URL and hreflang alternates. `locales` are the languages the page really exists in (a church
 * page only in the languages it has been translated into); other languages point search engines to English.
 */
export function alternates(path: string, lang: Locale, locales: readonly Locale[] = LOCALES): Metadata["alternates"] {
  return {
    canonical: localePath(path, locales.includes(lang) ? lang : "en"),
    languages: { ...Object.fromEntries(locales.map((l) => [l, localePath(path, l)])), "x-default": path },
  }
}

/** Open Graph basics shared by every public page (the image comes from opengraph-image files). */
export function openGraph(path: string, lang: Locale, title?: string, description?: string): Metadata["openGraph"] {
  return {
    type: "website", siteName: brandName(lang), url: localePath(path, lang), title, description,
    locale: LOCALE_REGION[lang], alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => LOCALE_REGION[l]),
  }
}

/** Simple Markdown (links, emphasis) as plain text, shortened for a meta description. */
export function plainText(md: string, max = 300) {
  const text = md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text
}

/** A <script type="application/ld+json"> body; "<" is escaped so the text can't close the tag. */
export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c")

/** A page title: Greek pages use the layout's template; other languages end with the brand in their script. */
export const pageTitle = (title: string, lang: Locale): Metadata["title"] => (lang === "el" ? title : { absolute: `${title} – ${brandName(lang)}` })
