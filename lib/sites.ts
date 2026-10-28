import "server-only"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { byLocale, normaliseContent, SITE_TYPES, slugify, translatedInto, type SiteContent, type SiteType } from "@/lib/content"
import { cached } from "@/lib/cache"
import { regions } from "@/lib/regions"
import { distanceKm } from "@/lib/geo"
import { deleteStored } from "@/lib/storage"
import type { ErrorMessage } from "@/lib/session"

const { sites, photos, videos } = schema

export type SiteInput = {
  slug: string
  type: SiteType
  region: string
  lat: number
  lng: number
  coordsVerified: boolean
  published: boolean
  content: SiteContent
  /** The Metropolis the church belongs to (null = not set). */
  metropolisId: number | null
}

export type PhotoInput = { src: string; captionEl?: string; captionEn?: string; credit?: string; sourceUrl?: string; historic?: boolean }

export type VideoInput = { youtubeId: string; titleEl?: string; titleEn?: string }

export type SiteWithPhotos = Omit<typeof sites.$inferSelect, "content"> & {
  content: SiteContent
  photos: (typeof photos.$inferSelect)[]
  videos: (typeof videos.$inferSelect)[]
}

const withContent = <T extends { content: string }>(s: T) => ({ ...s, content: normaliseContent(s.content) })

// Written out in full: drizzle renders ${sites.id} unqualified, which would match photos.id instead.
const coverSql = sql<string | null>`(SELECT p.src FROM photos p WHERE p.site_id = "sites"."id" ORDER BY p.sort, p.id LIMIT 1)`

export async function listSites({ publishedOnly }: { publishedOnly: boolean }) {
  const rows = await db.select({ site: sites, cover: coverSql }).from(sites)
    .where(publishedOnly ? eq(sites.published, true) : undefined)
    .orderBy(desc(sites.updatedAt))
  return rows.map(({ site, cover }) => ({ ...withContent(site), cover }))
}

/**
 * What the map, lists and "nearby" need of each published church: names, places and summaries in every
 * language, without the histories. One query, cached across requests.
 */
export const siteSummaries = cached("siteSummaries", async () => (await listSites({ publishedOnly: true })).map((s) => ({
  id: s.id, slug: s.slug, type: s.type as SiteType, region: s.region, lat: s.lat, lng: s.lng, coordsVerified: s.coordsVerified,
  cover: s.cover, metropolisId: s.metropolisId, updatedAt: s.updatedAt, locales: translatedInto(s.content),
  name: byLocale(s.content, "name"), location: byLocale(s.content, "location"), summary: byLocale(s.content, "summary"),
})))
export type SiteSummary = Awaited<ReturnType<typeof siteSummaries>>[number]

/** The published churches closest to a point, nearest first. */
export async function nearbySites(from: { id: number; lat: number; lng: number }, limit = 5) {
  return (await siteSummaries()).filter((s) => s.id !== from.id)
    .map((s) => ({ ...s, km: distanceKm(from, s) })).sort((a, b) => a.km - b.km).slice(0, limit)
}

/** A church page's data (also unpublished ones, for the admin preview), cached across requests. */
export const publicSite = cached("site", (slug: string) => getSite({ slug }))

export async function getSite(where: { id: number } | { slug: string }): Promise<SiteWithPhotos | null> {
  const [row] = await db.select().from(sites)
    .where("id" in where ? eq(sites.id, where.id) : eq(sites.slug, where.slug))
  if (!row) return null
  const [list, videoList] = await Promise.all([
    db.select().from(photos).where(eq(photos.siteId, row.id)).orderBy(asc(photos.sort), asc(photos.id)),
    db.select().from(videos).where(eq(videos.siteId, row.id)).orderBy(asc(videos.sort), asc(videos.id)),
  ])
  return { ...withContent(row), photos: list, videos: videoList }
}

/** Checks and cleans form input. Returns error messages as text keys. */
export function validateSite(raw: Record<string, unknown>): { errors: ErrorMessage[]; data: SiteInput } {
  const errors: ErrorMessage[] = []
  const content = normaliseContent(raw.content)
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  const type = raw.type as SiteType
  const region = String(raw.region ?? "")
  if (!Number.isFinite(lat) || lat < 34.4 || lat > 35.8) errors.push({ key: "error.site.lat" })
  if (!Number.isFinite(lng) || lng < 32.2 || lng > 34.7) errors.push({ key: "error.site.lng" })
  if (!SITE_TYPES.includes(type)) errors.push({ key: "error.site.type" })
  if (!regions.some((r) => r.id === region)) errors.push({ key: "error.site.region" })
  if (!content.el.name && !content.en.name) errors.push({ key: "error.site.name" })
  const slug = slugify(String(raw.slug || content.en.name || ""))
  if (!slug) errors.push({ key: "error.site.slug" })
  return {
    errors,
    data: {
      slug, type, region, lat, lng, coordsVerified: !!raw.coordsVerified, published: !!raw.published, content,
      metropolisId: Number(raw.metropolisId) > 0 ? Math.trunc(Number(raw.metropolisId)) : null,
    },
  }
}

export async function slugTaken(slug: string, exceptId?: number) {
  const [row] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, slug))
  return !!row && row.id !== exceptId
}

export async function createSite(input: SiteInput) {
  const [row] = await db.insert(sites).values({ ...input, content: JSON.stringify(input.content) }).returning({ id: sites.id })
  return row.id
}

export async function updateSite(id: number, input: Partial<SiteInput>) {
  const { content, ...rest } = input
  await db.update(sites).set({
    ...rest,
    ...(content ? { content: JSON.stringify(content) } : {}),
    updatedAt: sql`(datetime('now'))`,
  }).where(eq(sites.id, id))
}

export async function deleteSite(id: number) {
  const list = await db.select().from(photos).where(eq(photos.siteId, id))
  await db.delete(photos).where(eq(photos.siteId, id))
  await db.delete(videos).where(eq(videos.siteId, id))
  await db.delete(sites).where(eq(sites.id, id))
  await Promise.all(list.map((p) => deleteStored(p.src)))
}

export async function addPhoto(siteId: number, p: PhotoInput) {
  const [{ next }] = await db.select({ next: sql<number>`COALESCE(MAX(${photos.sort}), -1) + 1` }).from(photos).where(eq(photos.siteId, siteId))
  const [row] = await db.insert(photos).values({
    siteId, src: p.src, captionEl: p.captionEl ?? "", captionEn: p.captionEn ?? "",
    credit: p.credit ?? "", sourceUrl: p.sourceUrl ?? "", historic: !!p.historic, sort: next,
  }).returning()
  await touch(siteId)
  return row
}

export async function updatePhoto(id: number, p: Partial<Omit<PhotoInput, "src">>) {
  const [row] = await db.update(photos).set(p).where(eq(photos.id, id)).returning()
  if (row) await touch(row.siteId)
  return row
}

export async function deletePhoto(id: number) {
  const [row] = await db.delete(photos).where(eq(photos.id, id)).returning()
  if (row) {
    await deleteStored(row.src)
    await touch(row.siteId)
  }
}

export async function reorderPhotos(siteId: number, ids: number[]) {
  await Promise.all(ids.map((id, sort) => db.update(photos).set({ sort }).where(and(eq(photos.id, id), eq(photos.siteId, siteId)))))
  await touch(siteId)
}

export async function addVideo(siteId: number, v: VideoInput) {
  const [{ next }] = await db.select({ next: sql<number>`COALESCE(MAX(${videos.sort}), -1) + 1` }).from(videos).where(eq(videos.siteId, siteId))
  const [row] = await db.insert(videos).values({
    siteId, youtubeId: v.youtubeId, titleEl: v.titleEl ?? "", titleEn: v.titleEn ?? "", sort: next,
  }).returning()
  await touch(siteId)
  return row
}

export async function updateVideo(id: number, v: { titleEl: string; titleEn: string }) {
  const [row] = await db.update(videos).set(v).where(eq(videos.id, id)).returning()
  if (row) await touch(row.siteId)
}

export async function deleteVideo(id: number) {
  const [row] = await db.delete(videos).where(eq(videos.id, id)).returning()
  if (row) await touch(row.siteId)
}

const touch = (siteId: number) => db.update(sites).set({ updatedAt: sql`(datetime('now'))` }).where(eq(sites.id, siteId))
