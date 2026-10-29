import "server-only"
import { asc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { cached } from "@/lib/cache"
import type { Bounds, Camera } from "@/lib/editions"
import type { Lang } from "@/lib/content"
import { regionTree, type Region } from "@/lib/regions"
import { listEditions } from "@/lib/editions-server"

const { regions } = schema
const json = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? JSON.parse(s) : fallback } catch { return fallback } }

const columns = {
  id: regions.id, edition: regions.edition, parent: regions.parent, sort: regions.sort, name: regions.name,
  bounds: regions.bounds, camera: regions.camera, active: regions.active,
  hasBoundary: sql<number>`${regions.boundary} IS NOT NULL`,
}

/** Every region of every edition, without the outlines (admin pages: read directly). */
export async function listRegions(): Promise<Region[]> {
  const rows = await db.select(columns).from(regions).orderBy(asc(regions.sort), asc(regions.id))
  return rows.map((r) => ({
    ...r, parent: r.parent || null, name: json<Record<Lang, string>>(r.name, { el: r.id, en: r.id }),
    bounds: json<Bounds>(r.bounds, [[0, 0], [0, 0]]), camera: json<Camera | null>(r.camera, null), hasBoundary: !!r.hasBoundary,
  }))
}

/** The public pages' copy, cached across requests. */
export const getRegions = cached("regions", listRegions)

/** One edition's regions (active only, unless `all`). */
export async function editionRegions(edition: string, { all = false } = {}) {
  return (await getRegions()).filter((r) => r.edition === edition && (all || r.active))
}

/** The outlines of the active regions, as GeoJSON features with `properties.region` (components/map/terrain.ts). */
export const regionBoundaries = cached("regionBoundaries", async () => {
  const rows = await db.select({ id: regions.id, boundary: regions.boundary }).from(regions).where(sql`${regions.boundary} IS NOT NULL`)
  return {
    type: "FeatureCollection" as const,
    features: rows.flatMap((r) => {
      const geometry = json<GeoJSON.Geometry | null>(r.boundary, null)
      return geometry ? [{ type: "Feature" as const, properties: { region: r.id }, geometry }] : []
    }),
  }
})

export async function regionBoundary(id: string) {
  const [row] = await db.select({ boundary: regions.boundary }).from(regions).where(eq(regions.id, id))
  return row?.boundary ?? null
}

export type RegionInput = Omit<Region, "hasBoundary"> & { boundary?: string | null }

/** Saves a region; `boundary` undefined keeps the stored outline, null removes it. */
export async function saveRegion(isNew: boolean, r: RegionInput) {
  const values = {
    edition: r.edition, parent: r.parent, sort: r.sort, name: JSON.stringify(r.name), bounds: JSON.stringify(r.bounds),
    camera: r.camera ? JSON.stringify(r.camera) : null, active: r.active, updatedAt: sql`(datetime('now'))`,
    ...(r.boundary !== undefined ? { boundary: r.boundary } : {}),
  }
  if (isNew) await db.insert(regions).values({ id: r.id, ...values })
  else await db.update(regions).set(values).where(eq(regions.id, r.id))
}

export async function deleteRegion(id: string) {
  await db.delete(regions).where(eq(regions.id, id))
}

/** The regions for the church editor's list: grouped by edition (named when there are several), sub-regions indented. */
export async function regionOptions(lang: Lang) {
  const [regions, editions] = await Promise.all([listRegions(), listEditions()])
  const order = new Map(editions.map((e, i) => [e.id, i]))
  const multi = new Set(regions.map((r) => r.edition)).size > 1
  return regionTree(regions)
    .sort((a, b) => (order.get(a.edition) ?? 99) - (order.get(b.edition) ?? 99))
    .map((r) => {
      const e = editions.find((x) => x.id === r.edition)
      const prefix = (multi && e ? `${e.name[lang] || e.name.el} · ` : "") + (r.parent ? "— " : "")
      return { id: r.id, name: prefix + (r.name[lang] || r.name.el), active: r.active && !!e?.active, edition: r.edition, bounds: r.bounds, boundary: r.hasBoundary }
    })
}
