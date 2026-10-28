import "server-only"
import { asc, desc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import type { Lang } from "@/lib/content"
import { trData } from "@/lib/i18n"
import { tr, type Locale } from "@/lib/locales"
import { siteSummaries } from "@/lib/sites"
import { cached } from "@/lib/cache"

const { metropolises, metropolisNews, sites } = schema

export const METRO_FIELDS = ["name", "seat", "summary", "history"] as const
export type MetroContent = Record<Lang, Record<(typeof METRO_FIELDS)[number], string>>

export function normaliseMetroContent(input: unknown): MetroContent {
  const src = (typeof input === "string" ? safeJson(input) : input) as Partial<Record<Lang, Partial<Record<string, unknown>>>> | null
  const out = {} as MetroContent
  for (const lang of ["el", "en"] as const) {
    out[lang] = {} as MetroContent[Lang]
    for (const f of METRO_FIELDS) out[lang][f] = String(src?.[lang]?.[f] ?? "").trim()
  }
  return out
}
function safeJson(s: string) { try { return JSON.parse(s) } catch { return {} } }

/**
 * A Metropolis text in any language. Other languages show the English text (then Greek); the names of the
 * sees are translated in lib/messages/locales ("data.metropolis.<slug>").
 */
export function metroText(m: { slug: string; content: MetroContent }, field: (typeof METRO_FIELDS)[number], lang: Locale) {
  const record = { el: m.content.el[field], en: m.content.en[field] }
  return field === "name" ? trData(`data.metropolis.${m.slug}`, record, lang) : tr(record, lang)
}

const withContent = <T extends { content: string }>(m: T) => ({ ...m, content: normaliseMetroContent(m.content) })

/** All Metropolises with how many published churches each has and its newest headline. */
export async function listMetropolises() {
  const rows = await db.select({
    m: metropolises,
    churches: sql<number>`(SELECT COUNT(*) FROM sites s WHERE s.metropolis_id = "metropolises"."id" AND s.published = 1)`,
    latest: sql<string | null>`(SELECT json_object('title', n.title, 'url', n.url, 'date', n.published_at) FROM metropolis_news n
      WHERE n.metropolis_id = "metropolises"."id" ORDER BY n.published_at DESC LIMIT 1)`,
  }).from(metropolises).orderBy(asc(metropolises.sort), asc(metropolises.id))
  return rows.map(({ m, churches, latest }) => ({
    ...withContent(m), churches: Number(churches),
    latest: latest ? (JSON.parse(latest) as { title: string; url: string; date: string | null }) : null,
  }))
}

export async function getMetropolis(where: { slug: string } | { id: number }) {
  const [row] = await db.select().from(metropolises).where("slug" in where ? eq(metropolises.slug, where.slug) : eq(metropolises.id, where.id))
  return row ? withContent(row) : null
}

/** The public pages' copies, cached across requests (news is refreshed in the background, so at most 30 min old). */
export const publicMetropolises = cached("metropolises", listMetropolises, 1800)
export const publicMetropolis = cached("metropolis", (id: number) => getMetropolis({ id }))
export const publicMetropolisPage = cached("metropolisPage", (slug: string) => metropolisPage(slug), 1800)

/** A Metropolis page: its churches on the map and its latest news. */
export async function metropolisPage(slug: string) {
  const m = await getMetropolis({ slug })
  if (!m) return null
  const [churches, news] = await Promise.all([
    siteSummaries().then((all) => all.filter((s) => s.metropolisId === m.id)),
    db.select().from(metropolisNews).where(eq(metropolisNews.metropolisId, m.id)).orderBy(desc(metropolisNews.publishedAt)).limit(8),
  ])
  return { ...m, churches, news }
}

export type MetroInput = { slug: string; sort: number; website: string; feedUrl: string; logo: string; content: MetroContent }

export async function saveMetropolis(id: number | null, input: MetroInput) {
  const values = { ...input, content: JSON.stringify(input.content), updatedAt: sql`(datetime('now'))` }
  if (id) {
    await db.update(metropolises).set(values).where(eq(metropolises.id, id))
    return id
  }
  const [row] = await db.insert(metropolises).values(values).returning({ id: metropolises.id })
  return row.id
}

export async function deleteMetropolis(id: number) {
  await db.update(sites).set({ metropolisId: null }).where(eq(sites.metropolisId, id))
  await db.delete(metropolisNews).where(eq(metropolisNews.metropolisId, id))
  await db.delete(metropolises).where(eq(metropolises.id, id))
}

// ---- news from RSS / Atom feeds ----

const NEWS_MAX_AGE_MS = 60 * 60 * 1000 // refresh at most once an hour
const KEEP = 20

const decode = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim().normalize("NFC")
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? ""
const isoDate = (s: string) => { const d = new Date(s.trim()); return Number.isNaN(+d) ? null : d.toISOString() }
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s)

/** Items of an RSS 2.0 or Atom feed. */
export function parseFeed(xml: string) {
  const blocks = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi), ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0])
  return blocks.map((b) => {
    const atomLink = b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? b.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]
    return {
      title: clip(decode(tag(b, "title")), 300),
      url: decode(tag(b, "link")) || atomLink || "",
      summary: clip(decode(tag(b, "description") || tag(b, "summary") || tag(b, "content")), 280),
      publishedAt: isoDate(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date")),
    }
  }).filter((i) => i.title && /^https?:\/\//.test(i.url))
}

/** Reads the feed and stores the newest items. Returns how many items the feed had (or throws). */
export async function refreshNews(m: { id: number; feedUrl: string }) {
  if (!m.feedUrl) return 0
  const res = await fetch(m.feedUrl, {
    headers: { "User-Agent": "kyprosagiongi/0.1 (church heritage map)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`${res.status} ${m.feedUrl}`)
  const items = parseFeed(await res.text()).slice(0, KEEP)
  for (const i of items) {
    await db.insert(metropolisNews).values({ metropolisId: m.id, ...i })
      .onConflictDoUpdate({ target: [metropolisNews.metropolisId, metropolisNews.url], set: { title: i.title, summary: i.summary, publishedAt: i.publishedAt } })
  }
  // Keep only the newest items.
  await db.run(sql`DELETE FROM metropolis_news WHERE metropolis_id = ${m.id} AND id NOT IN
    (SELECT id FROM metropolis_news WHERE metropolis_id = ${m.id} ORDER BY published_at DESC LIMIT ${KEEP})`)
  await db.update(metropolises).set({ newsFetchedAt: sql`(datetime('now'))` }).where(eq(metropolises.id, m.id))
  return items.length
}

/** Refreshes the news of every Metropolis whose items are older than an hour (errors are logged, not thrown). */
export async function refreshStaleNews() {
  const rows = await db.select({ id: metropolises.id, feedUrl: metropolises.feedUrl, fetched: metropolises.newsFetchedAt }).from(metropolises)
  const stale = rows.filter((m) => m.feedUrl && (!m.fetched || Date.now() - Date.parse(`${m.fetched}Z`) > NEWS_MAX_AGE_MS))
  await Promise.all(stale.map((m) => refreshNews(m).catch((e) => console.error(`news ${m.feedUrl}:`, (e as Error).message))))
}
