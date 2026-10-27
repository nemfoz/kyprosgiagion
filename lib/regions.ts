import config from "@/data/regions.json"
import type { Lang } from "@/lib/content"
import type { Locale } from "@/lib/locales"
import { trData } from "@/lib/i18n"

export type Region = {
  id: string
  parent?: string
  name: Record<Lang, string>
  boundary?: string
  bounds: [[number, number], [number, number]]
  camera?: { bearing: number; pitch: number }
  active: boolean
}
export type Place = { el: string; en: string; lat: number; lng: number; major?: boolean }

export const siteTitle = config.siteTitle as Record<Lang, string>
/** The site's name in any language. */
export const siteName = (l: Locale) => trData("data.siteTitle", siteTitle, l)
/** A region's name in any language. */
export const regionName = (r: Region, l: Locale) => trData(`data.region.${r.id}`, r.name, l)
export const defaultRegion = config.defaultRegion
export const regions = config.regions as Region[]
export const places = config.places as Place[]

/** The region and all its ancestors (a Karpasia site also belongs to Famagusta District). */
export function regionAncestors(id: string): string[] {
  const r = regions.find((x) => x.id === id)
  return r ? [id, ...(r.parent ? regionAncestors(r.parent) : [])] : [id]
}
