import "server-only"
import { asc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { cached } from "@/lib/cache"
import type { Lang } from "@/lib/content"
import type { Bounds, Camera, Edition } from "@/lib/editions"

const { editions } = schema
const json = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? JSON.parse(s) : fallback } catch { return fallback } }
const pair = (v: unknown): Record<Lang, string> => {
  const o = (v ?? {}) as Partial<Record<Lang, unknown>>
  return { el: String(o.el ?? "").trim(), en: String(o.en ?? "").trim() }
}

function toEdition(row: typeof editions.$inferSelect): Edition {
  const c = json<Record<string, unknown>>(row.content, {})
  const name = pair(c.name)
  const title = pair(c.title)
  return {
    id: row.id, sort: row.sort, name, church: pair(c.church),
    title: { el: title.el || name.el, en: title.en || name.en }, intro: pair(c.intro),
    active: row.active, bounds: json<Bounds>(row.bounds, [[-60, -180], [80, 180]]), camera: json<Camera | null>(row.camera, null),
    defaultRegion: row.defaultRegion || null, countries: json<string[]>(row.countries, []),
  }
}

/** Every edition, in the order of the diptychs (admin pages: read directly). */
export async function listEditions(): Promise<Edition[]> {
  return (await db.select().from(editions).orderBy(asc(editions.sort), asc(editions.id))).map(toEdition)
}

/** The public pages' copy, cached across requests. */
export const getEditions = cached("editions", listEditions)

export async function getEdition(id: string) {
  return (await getEditions()).find((e) => e.id === id) ?? null
}

export type EditionInput = Omit<Edition, "id"> & { id: string }

export async function saveEdition(isNew: boolean, e: EditionInput) {
  const values = {
    sort: e.sort, active: e.active, bounds: JSON.stringify(e.bounds), camera: e.camera ? JSON.stringify(e.camera) : null,
    defaultRegion: e.defaultRegion, countries: JSON.stringify(e.countries),
    content: JSON.stringify({ name: e.name, church: e.church, title: e.title, intro: e.intro }),
    updatedAt: sql`(datetime('now'))`,
  }
  if (isNew) await db.insert(editions).values({ id: e.id, ...values })
  else await db.update(editions).set(values).where(eq(editions.id, e.id))
}

export async function deleteEdition(id: string) {
  await db.delete(editions).where(eq(editions.id, id))
}
