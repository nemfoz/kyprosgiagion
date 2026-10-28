// Site content model and the small text format used for history, details and sources.
import { EXTRA_LOCALES, fallbacks, type ExtraLocale, type Locale } from "@/lib/locales"

export const SITE_TYPES = ["church", "monastery", "chapel", "basilica"] as const
export type SiteType = (typeof SITE_TYPES)[number]
export type Lang = "el" | "en"
export const LANGS: Lang[] = ["el", "en"]

export const TYPE_LABELS: Record<SiteType, Record<Lang, string>> = {
  church: { el: "Ναός", en: "Church" },
  monastery: { el: "Μονή", en: "Monastery" },
  chapel: { el: "Εκκλησάκι", en: "Chapel" },
  basilica: { el: "Βασιλική / Ερείπια", en: "Basilica / Ruins" },
}

export const TEXT_FIELDS = ["name", "location", "summary", "body", "facts", "sources"] as const
export type LangContent = Record<(typeof TEXT_FIELDS)[number], string>
/** Fields translated into the extra languages (sources are links and stay as they are). */
export const EXTRA_FIELDS = ["name", "location", "summary", "body", "facts"] as const
/** Greek and English are always present; other languages only once someone has translated the page. */
export type SiteContent = Record<Lang, LangContent> & Partial<Record<ExtraLocale, Partial<LangContent>>>

export function normaliseContent(input: unknown): SiteContent {
  const src = (typeof input === "string" ? safeJson(input) : input) as Partial<Record<Locale, Partial<LangContent>>> | null
  const out = {} as SiteContent
  for (const lang of LANGS) {
    out[lang] = {} as LangContent
    for (const f of TEXT_FIELDS) out[lang][f] = String(src?.[lang]?.[f] ?? "").trim()
  }
  for (const l of EXTRA_LOCALES) {
    const t: Partial<LangContent> = {}
    for (const f of EXTRA_FIELDS) {
      const v = String(src?.[l]?.[f] ?? "").trim()
      if (v) t[f] = v
    }
    if (Object.keys(t).length) out[l] = t
  }
  return out
}

/** The extra languages a page has been translated into (at least its name and short description). */
export const translatedInto = (c: SiteContent): ExtraLocale[] => EXTRA_LOCALES.filter((l) => c[l]?.name && c[l]?.summary)

function safeJson(s: string) {
  try { return JSON.parse(s) } catch { return {} }
}

/** One field in every language it is filled in (for client components that switch language themselves). */
export function byLocale(c: SiteContent, field: (typeof EXTRA_FIELDS)[number]): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = { el: c.el[field], en: c.en[field] }
  for (const l of EXTRA_LOCALES) if (c[l]?.[field]) out[l] = c[l]![field]
  return out
}

/** Picks the requested language, falling back to English, then Greek, when a field is empty. */
export function pick(c: SiteContent, lang: Locale, field: keyof LangContent) {
  for (const l of fallbacks(lang)) if (c[l]?.[field]) return c[l]![field]!
  return ""
}

export const slugify = (s: string) => String(s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)

export const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

// Links always show where they lead: "text (domain)" for [text](url), the URL itself for bare links.
const domain = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url } }
// Links to our own pages (/…) open in place, without a domain.
const link = (href: string, text: string) => href.startsWith("/")
  ? `<a href="${href}">${text}</a>`
  : `<a href="${href}" target="_blank" rel="noopener">${text}</a>` +
    (text === href ? "" : ` <span class="link-domain">(${esc(domain(href))})</span>`)

/** Inline formatting on already-escaped text. */
export function inline(text: string) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, (_, t, href) => link(href, t))
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, href) => pre + link(href, href))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
}

/** The video id of a YouTube link (watch, youtu.be, shorts, embed, live), or null. */
export function youtubeId(url: string): string | null {
  const m = String(url ?? "").trim().match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([\w-]{11})(?:[?&#/].*)?$/i,
  )
  return m ? m[1] : null
}

/** Privacy-friendly embed address (no cookies until the visitor presses play). */
export const youtubeEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`

const videoFrame = (id: string) =>
  `<div class="video-embed"><iframe src="${youtubeEmbed(id)}" title="YouTube" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`

const blocks = (src: string) => String(src ?? "").replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)

/**
 * Minimal Markdown: ## / ### headings, "- " lists, paragraphs, **bold**, *italic*, [links](url).
 * A YouTube link alone in its paragraph becomes an embedded video. HTML is escaped.
 */
export function markdown(src: string) {
  let section = 0
  return blocks(src)
    .map((block) => {
      const h = block.match(/^(#{2,3})\s+([\s\S]*)$/)
      // Main headings get ids (#s1, #s2, …) for the section links on church pages.
      if (h) return `<h${h[1].length}${h[1].length === 2 ? ` id="s${++section}"` : ""}>${inline(h[2])}</h${h[1].length}>`
      const video = youtubeId(block)
      if (video) return videoFrame(video)
      const lines = block.split("\n")
      if (lines.every((l) => /^-\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^-\s+/, ""))}</li>`).join("")}</ul>`
      return `<p>${lines.map(inline).join("<br>")}</p>`
    })
    .join("\n")
}

/** The main (##) headings of a text as plain text, in the order of their ids in markdown(). */
export function headings(src: string) {
  return blocks(src).flatMap((b) => {
    const h = b.match(/^##\s+([\s\S]*)$/)
    return h ? [h[1].replace(/[*_`[\]]|\(https?:[^)]*\)/g, "").trim()] : []
  })
}

/** "Label: Value" per line → [label, value] pairs. */
export function parseFacts(src: string): [string, string][] {
  return String(src ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(":")
    return i > 0 && !/^https?$/i.test(l.slice(0, i)) ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l]
  })
}

export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`
