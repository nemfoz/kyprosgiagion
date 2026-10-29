// Regions of an edition (districts, peninsulas…): the map's region filter and highlighted outline. They live in
// the database (seeded from data/regions.json, edited at /admin/regions — lib/regions-server.ts).
// This file is safe for client components.
import config from "@/data/regions.json"
import type { Lang } from "@/lib/content"
import type { Bounds, Camera } from "@/lib/editions"
import type { Locale } from "@/lib/locales"
import { trData } from "@/lib/i18n"

export type Region = {
  id: string
  edition: string
  parent: string | null
  sort: number
  name: Record<Lang, string>
  bounds: Bounds
  camera: Camera | null
  /** Whether it has an outline (served by /api/boundaries). */
  hasBoundary: boolean
  active: boolean
}
export type Place = { el: string; en: string; lat: number; lng: number; major?: boolean }

/** A valid region id (lowercase latin letters, digits and dashes). */
export const REGION_ID = /^[a-z][a-z0-9-]{1,39}$/

/** A region's name in any language. */
export const regionName = (r: Pick<Region, "id" | "name">, l: Locale) => trData(`data.region.${r.id}`, r.name, l)
/** Village and town labels on the Cyprus map. */
export const places = config.places as Place[]

/** The region and all its ancestors (a Karpasia site also belongs to Famagusta District). */
export function regionAncestors(regions: Pick<Region, "id" | "parent">[], id: string): string[] {
  const r = regions.find((x) => x.id === id)
  return r ? [id, ...(r.parent && r.parent !== id ? regionAncestors(regions.filter((x) => x.id !== id), r.parent) : [])] : [id]
}

/** Regions in display order, each followed by its sub-regions. */
export function regionTree<R extends Pick<Region, "id" | "parent" | "sort">>(regions: R[]): R[] {
  const ids = new Set(regions.map((r) => r.id))
  const bySort = [...regions].sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
  const out: R[] = []
  const add = (parent: string | null) => {
    for (const r of bySort.filter((x) => (parent ? x.parent === parent : !x.parent || !ids.has(x.parent)))) {
      if (out.includes(r)) continue
      out.push(r)
      add(r.id)
    }
  }
  add(null)
  return out
}
