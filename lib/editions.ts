// Οδοιπορικό is the umbrella brand; each Orthodox Church is an edition under it, with its own landing page, map,
// sees and church pages: /cyprus, /cyprus/map, /cyprus/metropolis/x, /cyprus/site/x (app/[edition]).
// Editions live in the database (seeded from data/editions.json, edited at /admin/editions — lib/editions-server.ts);
// an edition that isn't active is listed on the home page as "coming soon" and only admins can open it.
// This file is safe for client components: types, names and addresses only.
import type { Lang } from "@/lib/content"
import type { Locale } from "@/lib/locales"
import { trData } from "@/lib/i18n"

/** The brand: Greek in Greek, ODOIPORIKO (never translated) in every other language. */
export const brandName = (l: Locale) => (l === "el" ? "Οδοιπορικό" : "Odoiporiko")

export type Bounds = [[number, number], [number, number]]
export type Camera = { bearing: number; pitch: number }

export type Edition = {
  id: string
  sort: number
  /** The country / region, e.g. Κύπρος. */
  name: Record<Lang, string>
  /** The Church whose churches the edition maps. */
  church: Record<Lang, string>
  /** The edition's own title, e.g. "Κύπρος – Αγίων Γη" (defaults to the name). */
  title: Record<Lang, string>
  /** The landing page's introduction (empty: a general text). */
  intro: Record<Lang, string>
  active: boolean
  /** [[south, west], [north, east]] — the whole edition on the map. */
  bounds: Bounds
  camera: Camera | null
  /** The region the map opens on (none: the whole edition). */
  defaultRegion: string | null
  /** ISO country codes it covers (highlighted on the home page's world map). */
  countries: string[]
}

export const editionName = (e: Pick<Edition, "id" | "name">, l: Locale) => trData(`data.edition.${e.id}`, e.name, l)
export const editionChurch = (e: Pick<Edition, "id" | "church">, l: Locale) => trData(`data.church.${e.id}`, e.church, l)
/** The edition's title; Cyprus keeps its older translation key. */
export const editionTitle = (e: Pick<Edition, "id" | "title">, l: Locale) =>
  trData(e.id === "cyprus" ? "data.siteTitle" : `data.editionTitle.${e.id}`, e.title, l)

/** A valid edition id: lowercase latin letters, digits and dashes (it is the first part of the address). */
export const EDITION_ID = /^[a-z][a-z0-9-]{1,39}$/

// Addresses of an edition's pages (without the language prefix: wrap them in localePath).
export function editionPaths(edition: string) {
  const base = `/${edition}`
  return {
    home: base,
    map: `${base}/map`,
    site: (slug: string) => `${base}/site/${encodeURIComponent(slug)}`,
    /** The map with a church selected. */
    onMap: (slug: string) => `${base}/map?site=${encodeURIComponent(slug)}`,
    metropolises: `${base}/metropolis`,
    metropolis: (slug: string) => `${base}/metropolis/${encodeURIComponent(slug)}`,
  }
}
export type EditionPaths = ReturnType<typeof editionPaths>

/** The church page of a site whose edition is known (site summaries carry it). */
export const sitePath = (s: { slug: string; edition: string }) => editionPaths(s.edition).site(s.slug)

/** The edition that pages outside any edition (name days, contribute…) link their map and sees to. */
export const DEFAULT_EDITION = "cyprus"
