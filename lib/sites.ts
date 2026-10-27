import "server-only"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { normaliseContent, SITE_TYPES, slugify, type SiteContent, type SiteType } from "@/lib/content"
import { regions } from "@/lib/regions"
import { deleteStored } from "@/lib/storage"

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

/** Checks and cleans form input. Returns error messages in Greek. */
export function validateSite(raw: Record<string, unknown>): { errors: string[]; data: SiteInput } {
  const errors: string[] = []
  const content = normaliseContent(raw.content)
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  const type = raw.type as SiteType
  const region = String(raw.region ?? "")
  if (!Number.isFinite(lat) || lat < 34.4 || lat > 35.8) errors.push("Το γεωγραφικό πλάτος (Lat) πρέπει να είναι εντός Κύπρου (34.4 – 35.8).")
  if (!Number.isFinite(lng) || lng < 32.2 || lng > 34.7) errors.push("Το γεωγραφικό μήκος (Lng) πρέπει να είναι εντός Κύπρου (32.2 – 34.7).")
  if (!SITE_TYPES.includes(type)) errors.push("Μη έγκυρος τύπος.")
  if (!regions.some((r) => r.id === region)) errors.push("Άγνωστη περιοχή.")
  if (!content.el.name && !content.en.name) errors.push("Απαιτείται όνομα σε τουλάχιστον μία γλώσσα.")
  const slug = slugify(String(raw.slug || content.en.name || ""))
  if (!slug) errors.push("Απαιτείται διεύθυνση σελίδας (slug) με λατινικούς χαρακτήρες — ή συμπληρώστε το αγγλικό όνομα.")
  return {
    errors,
    data: { slug, type, region, lat, lng, coordsVerified: !!raw.coordsVerified, published: !!raw.published, content },
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
