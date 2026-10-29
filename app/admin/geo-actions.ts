"use server"

import { revalidatePath, updateTag } from "next/cache"
import { eq } from "drizzle-orm"
import { PUBLIC_TAG } from "@/lib/cache"
import { db, schema } from "@/lib/db"
import { EDITION_ID, type Bounds, type Camera } from "@/lib/editions"
import { deleteEdition, listEditions, saveEdition } from "@/lib/editions-server"
import { getAdminT } from "@/lib/i18n-server"
import { REGION_ID } from "@/lib/regions"
import { deleteRegion, listRegions, saveRegion } from "@/lib/regions-server"
import { assertRole, UserError } from "@/lib/session"
import type { Lang } from "@/lib/content"

// Editions (Churches) and their regions — superadmins only.
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    await assertRole("superadmin")
    const r = await fn()
    updateTag(PUBLIC_TAG)
    revalidatePath("/", "layout")
    return { ok: true, ...r }
  } catch (e) {
    const t = await getAdminT()
    if (e instanceof UserError) return { ok: false, error: e.messages.map((m) => t(m.key, m.vars)).join(" ") }
    console.error(e)
    return { ok: false, error: t("error.generic") }
  }
}

const text = (v: unknown, max = 4000) => String(v ?? "").trim().slice(0, max)
const pair = (v: unknown, max = 300): Record<Lang, string> => {
  const o = (v ?? {}) as Record<string, unknown>
  return { el: text(o.el, max), en: text(o.en, max) }
}
function bounds(v: unknown): Bounds {
  const b = v as number[][]
  const ok = Array.isArray(b) && b.length === 2 && b.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
  if (!ok) throw new UserError("geo.error.bounds")
  const [[s, w], [n, e]] = b as Bounds
  if (s < -90 || n > 90 || w < -180 || e > 180 || s >= n || w >= e) throw new UserError("geo.error.bounds")
  return [[s, w], [n, e]]
}
function camera(v: unknown): Camera | null {
  const c = v as Partial<Camera> | null
  if (!c || (c.bearing == null && c.pitch == null)) return null
  const bearing = Number(c.bearing ?? 0), pitch = Number(c.pitch ?? 50)
  if (!Number.isFinite(bearing) || !Number.isFinite(pitch)) return null
  return { bearing: Math.max(-180, Math.min(180, bearing)), pitch: Math.max(0, Math.min(65, pitch)) }
}

export async function saveEditionAction(isNew: boolean, raw: Record<string, unknown>) {
  return run(async () => {
    const id = text(raw.id, 40).toLowerCase()
    if (!EDITION_ID.test(id)) throw new UserError("geo.error.id")
    const existing = (await listEditions()).find((e) => e.id === id)
    if (isNew && existing) throw new UserError("geo.error.idTaken")
    if (!isNew && !existing) throw new UserError("geo.error.notFound")
    const name = pair(raw.name)
    if (!name.el && !name.en) throw new UserError("geo.error.name")
    const regions = await listRegions()
    const defaultRegion = text(raw.defaultRegion, 40) || null
    if (defaultRegion && !regions.some((r) => r.id === defaultRegion && r.edition === id)) throw new UserError("geo.error.defaultRegion")
    const countries = String(raw.countries ?? "").toUpperCase().split(/[\s,;]+/).filter((c) => /^[A-Z]{2}$/.test(c))
    await saveEdition(isNew, {
      id, sort: Number(raw.sort) || 0, name, church: pair(raw.church), title: pair(raw.title), intro: pair(raw.intro, 2000),
      active: !!raw.active, bounds: bounds(raw.bounds), camera: camera(raw.camera), defaultRegion, countries,
    })
    return { id }
  })
}

export async function setEditionActiveAction(id: string, active: boolean) {
  return run(async () => {
    await db.update(schema.editions).set({ active: !!active }).where(eq(schema.editions.id, id))
    return {}
  })
}

/** Only an edition without regions and sees can be deleted (its churches would have nowhere to go). */
export async function deleteEditionAction(id: string) {
  return run(async () => {
    const [regions, [see]] = await Promise.all([listRegions(), db.select({ id: schema.metropolises.id }).from(schema.metropolises).where(eq(schema.metropolises.edition, id)).limit(1)])
    if (regions.some((r) => r.edition === id) || see) throw new UserError("geo.error.editionInUse")
    await deleteEdition(id)
    return {}
  })
}

// An uploaded/pasted outline: a GeoJSON Feature, FeatureCollection (first polygon) or geometry → (Multi)Polygon JSON.
function outline(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === "") return null
  let g: { type?: string; geometry?: unknown; features?: { geometry?: unknown }[]; coordinates?: unknown }
  try { g = typeof raw === "string" ? JSON.parse(raw) : (raw as typeof g) } catch { throw new UserError("geo.error.outline") }
  if (g?.type === "FeatureCollection") g = (g.features?.find((f) => /Polygon/.test((f.geometry as { type?: string })?.type ?? ""))?.geometry ?? {}) as typeof g
  else if (g?.type === "Feature") g = (g.geometry ?? {}) as typeof g
  if ((g?.type !== "Polygon" && g?.type !== "MultiPolygon") || !Array.isArray(g.coordinates)) throw new UserError("geo.error.outline")
  const json = JSON.stringify({ type: g.type, coordinates: g.coordinates })
  if (json.length > 1_500_000) throw new UserError("geo.error.outlineTooBig")
  return json
}

export async function saveRegionAction(isNew: boolean, raw: Record<string, unknown>) {
  return run(async () => {
    const id = text(raw.id, 40).toLowerCase()
    if (!REGION_ID.test(id) || id === "all") throw new UserError("geo.error.id")
    const [regions, editions] = await Promise.all([listRegions(), listEditions()])
    const existing = regions.find((r) => r.id === id)
    if (isNew && existing) throw new UserError("geo.error.idTaken")
    if (!isNew && !existing) throw new UserError("geo.error.notFound")
    const edition = text(raw.edition, 40)
    if (!editions.some((e) => e.id === edition)) throw new UserError("geo.error.edition")
    const parent = text(raw.parent, 40) || null
    if (parent && (parent === id || !regions.some((r) => r.id === parent && r.edition === edition))) throw new UserError("geo.error.parent")
    const name = pair(raw.name)
    if (!name.el && !name.en) throw new UserError("geo.error.name")
    await saveRegion(isNew, {
      id, edition, parent, sort: Number(raw.sort) || 0, name, active: !!raw.active,
      bounds: bounds(raw.bounds), camera: camera(raw.camera), boundary: outline(raw.boundary),
    })
    return { id }
  })
}

export async function setRegionActiveAction(id: string, active: boolean) {
  return run(async () => {
    await db.update(schema.regions).set({ active: !!active }).where(eq(schema.regions.id, id))
    return {}
  })
}

/** Only a region without churches and sub-regions can be deleted. */
export async function deleteRegionAction(id: string) {
  return run(async () => {
    const [regions, [site]] = await Promise.all([listRegions(), db.select({ id: schema.sites.id }).from(schema.sites).where(eq(schema.sites.region, id)).limit(1)])
    if (site || regions.some((r) => r.parent === id)) throw new UserError("geo.error.regionInUse")
    await deleteRegion(id)
    return {}
  })
}
