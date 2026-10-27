import type { Metadata } from "next"
import type { Lang } from "@/lib/content"

// The public address: SITE_URL if set (e.g. a custom domain), else Vercel's production domain, else local dev.
export const SITE_URL = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "")

export const SITE_NAME = { el: "Κύπρος – Αγίων Γη", en: "Cyprus – Land of Saints" }

/** A page's address in each language: Greek is the plain path, English adds ?lang=en. */
export function langUrl(path: string, lang: Lang) {
  return lang === "en" ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path
}

/** Canonical URL and hreflang alternates for a page that exists in both languages. */
export function alternates(path: string, lang: Lang): Metadata["alternates"] {
  return { canonical: langUrl(path, lang), languages: { el: path, en: langUrl(path, "en"), "x-default": path } }
}

/** Open Graph basics shared by every public page (the image comes from opengraph-image files). */
export function openGraph(path: string, lang: Lang, title?: string, description?: string): Metadata["openGraph"] {
  return {
    type: "website", siteName: SITE_NAME[lang], url: langUrl(path, lang), title, description,
    locale: lang === "el" ? "el_GR" : "en_GB", alternateLocale: lang === "el" ? "en_GB" : "el_GR",
  }
}

/** Simple Markdown (links, emphasis) as plain text, shortened for a meta description. */
export function plainText(md: string, max = 300) {
  const text = md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text
}

/** A <script type="application/ld+json"> body; "<" is escaped so the text can't close the tag. */
export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c")

/** A page title: Greek pages use the layout's template; English pages end with the English site name. */
export const pageTitle = (title: string, lang: Lang): Metadata["title"] => (lang === "en" ? { absolute: `${title} – ${SITE_NAME.en}` } : title)
