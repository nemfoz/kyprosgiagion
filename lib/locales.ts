// The languages of the public pages. Greek and English are complete (every text, every church page,
// the admin); the others are languages of Orthodox visitors, translated as far as volunteers get —
// anything missing falls back to English, then Greek.
//
// URLs: Greek is the plain path (/site/x), every other language has a prefix (/en/site/x, /ru/site/x).
// proxy.ts turns the prefix into ?lang=… for the pages.
import type { Lang } from "@/lib/content"

export const LOCALES = ["el", "en", "ru", "uk", "ro", "bg", "sr", "ka"] as const
export type Locale = (typeof LOCALES)[number]
export type ExtraLocale = Exclude<Locale, Lang>
export const EXTRA_LOCALES = LOCALES.filter((l): l is ExtraLocale => l !== "el" && l !== "en")

/** Each language in its own name, for the language menu. */
export const LOCALE_NAMES: Record<Locale, string> = {
  el: "Ελληνικά", en: "English", ru: "Русский", uk: "Українська", ro: "Română", bg: "Български", sr: "Српски", ka: "ქართული",
}
/** Short label for the header button. */
export const LOCALE_SHORT: Record<Locale, string> = { el: "ΕΛ", en: "EN", ru: "RU", uk: "UK", ro: "RO", bg: "BG", sr: "SR", ka: "KA" }
/** Open Graph / Intl locale. */
export const LOCALE_REGION: Record<Locale, string> = {
  el: "el_GR", en: "en_GB", ru: "ru_RU", uk: "uk_UA", ro: "ro_RO", bg: "bg_BG", sr: "sr_RS", ka: "ka_GE",
}

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v)
export const isExtra = (l: Locale): l is ExtraLocale => l !== "el" && l !== "en"

/** The language whose texts are used when this one has none: extra languages → English; English ↔ Greek. */
export const baseLang = (l: Locale): Lang => (l === "el" ? "el" : "en")
/** Lookup order for a text: the language itself, then English, then Greek. */
export const fallbacks = (l: Locale): Locale[] => (l === "el" ? ["el", "en"] : l === "en" ? ["en", "el"] : [l, "en", "el"])

/** A value from a per-language record, falling back to English, then Greek. */
export function tr(record: Partial<Record<Locale, string>> | undefined, l: Locale): string {
  for (const x of fallbacks(l)) if (record?.[x]) return record[x]!
  return ""
}

/** A page's address in a language: /site/x (Greek), /en/site/x, /ru/site/x… Keeps any query string. */
export function localePath(path: string, l: Locale) {
  if (l === "el") return path
  return `/${l}${path === "/" ? "" : path.startsWith("/?") ? path.slice(1) : path}`
}

/** For use in Intl APIs. */
export const intlLocale = (l: Locale) => LOCALE_REGION[l].replace("_", "-")
