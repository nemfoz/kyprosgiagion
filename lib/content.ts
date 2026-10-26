// Site content model and the small text format used for history, details and sources.

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
export type SiteContent = Record<Lang, LangContent>

export function normaliseContent(input: unknown): SiteContent {
  const src = (typeof input === "string" ? safeJson(input) : input) as Partial<Record<Lang, Partial<LangContent>>> | null
  const out = {} as SiteContent
  for (const lang of LANGS) {
    out[lang] = {} as LangContent
    for (const f of TEXT_FIELDS) out[lang][f] = String(src?.[lang]?.[f] ?? "").trim()
  }
  return out
}

function safeJson(s: string) {
  try { return JSON.parse(s) } catch { return {} }
}

/** Picks the requested language, falling back to the other one when a field is empty. */
export function pick(c: SiteContent, lang: Lang, field: keyof LangContent) {
  return c[lang][field] || c[lang === "el" ? "en" : "el"][field]
}

export const slugify = (s: string) => String(s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)

export const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

// Links always show where they lead: "text (domain)" for [text](url), the URL itself for bare links.
const domain = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url } }
const link = (href: string, text: string) =>
  `<a href="${href}" target="_blank" rel="noopener">${text}</a>` +
  (text === href ? "" : ` <span class="link-domain">(${esc(domain(href))})</span>`)

/** Inline formatting on already-escaped text. */
export function inline(text: string) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, (_, t, href) => link(href, t))
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, href) => pre + link(href, href))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
}

/** Minimal Markdown: ## / ### headings, "- " lists, paragraphs, **bold**, *italic*, [links](url). HTML is escaped. */
export function markdown(src: string) {
  return String(src ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const h = block.match(/^(#{2,3})\s+([\s\S]*)$/)
      if (h) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`
      const lines = block.split("\n")
      if (lines.every((l) => /^-\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^-\s+/, ""))}</li>`).join("")}</ul>`
      return `<p>${lines.map(inline).join("<br>")}</p>`
    })
    .join("\n")
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
