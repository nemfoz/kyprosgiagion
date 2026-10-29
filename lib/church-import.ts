import "server-only"
import { db, schema } from "@/lib/db"
import { normaliseContent, SITE_TYPES, slugify, type SiteType } from "@/lib/content"
import { listEditions } from "@/lib/editions-server"
import { distanceKm, inGeometry } from "@/lib/geo"
import type { ImportRow } from "@/lib/import-rows"
import { listMetropolises } from "@/lib/metropolises"
import { listRegions, regionBoundaries } from "@/lib/regions-server"
import { addPhoto, createSite } from "@/lib/sites"
import { rehostImage } from "@/lib/storage"
import { greekToLatin } from "@/lib/translit"
import { geocodePlace } from "@/lib/geocode"

// Adding many churches at once (admin bulk import, Metropolis website importers, quick add):
// check() normalises and checks the rows and finds likely duplicates — nothing is written;
// commit() then creates the chosen rows (drafts unless published) and copies their photos.

export const MAX_ROWS = 1000

export type ImportDefaults = { region: string; see: string | null; published: boolean }

export type CheckedRow = {
  index: number
  row: CleanRow
  slug: string
  region: string
  see: string | null
  /** "ok" — will be added; "duplicate" — looks like a church already on the map; "error" — can't be added. */
  status: "ok" | "duplicate" | "error"
  problems: string[]
  /** Information that isn't a problem, e.g. "placed at the village centre". */
  notes: string[]
  duplicateOf?: { id: number; slug: string; name: string; metres: number | null }
}

const str = (v: unknown, max = 500) => (v == null ? "" : String(v).trim().slice(0, max))
const num = (v: unknown) => {
  if (v == null || v === "") return null
  const n = Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : null
}
const fold = (s: string) => greekToLatin(s).toLowerCase().replace(/[^a-z0-9]+/g, " ")
  .replace(/\b(church|of|the|ieros|naos|i n|agios|agia|agiou|agias|ayios|ayia|ayiou|saint|st)\b/g, " ").replace(/\s+/g, " ").trim()

/** Coordinates in a Google Maps link (…@35.1,33.9…, …!3d35.1!4d33.9…, ?q=35.1,33.9) or "35.1, 33.9". */
export function coordsIn(text: string): { lat: number; lng: number } | null {
  const m = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    || text.match(/[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i) || text.match(/^\s*(-?\d{1,2}\.\d+)\s*[,; ]\s*(-?\d{1,3}\.\d+)\s*$/)
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null
}

// Short Google Maps links (maps.app.goo.gl, goo.gl/maps) lead to the full address with the coordinates.
const SHORT = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//
async function resolveMapUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  const direct = coordsIn(url)
  if (direct || !SHORT.test(url)) return direct
  try {
    let next = url
    for (let i = 0; i < 4; i++) {
      const res = await fetch(next, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "odoiporiko/1.0 (church map importer)" } })
      const loc = res.headers.get("location")
      if (!loc) return coordsIn(await res.text().catch(() => ""))
      const found = coordsIn(decodeURIComponent(loc))
      if (found) return found
      next = new URL(loc, next).toString()
      if (!/^https:\/\/([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl)\//.test(next)) return null
    }
  } catch {}
  return null
}

/** Cleans one row as it came from a spreadsheet or importer (any field may be missing or text). */
type CleanRow = Omit<ImportRow, "lat" | "lng"> & { lat: number | null; lng: number | null }

function clean(raw: Record<string, unknown>): CleanRow {
  const type = str(raw.type).toLowerCase() as SiteType
  const coords = str(raw.coords).toLowerCase()
  return {
    name_el: str(raw.name_el, 200), name_en: str(raw.name_en, 200),
    type: SITE_TYPES.includes(type) ? type : undefined,
    location_el: str(raw.location_el, 200), location_en: str(raw.location_en, 200),
    region: str(raw.region, 40), see: str(raw.see, 80),
    lat: num(raw.lat), lng: num(raw.lng), map_url: str(raw.map_url, 1000),
    coords: coords.startsWith("approx") ? "approximate" : coords ? "exact" : undefined,
    summary_el: str(raw.summary_el, 1000), summary_en: str(raw.summary_en, 1000),
    image: str(raw.image, 1000), source: str(raw.source, 1000), source_label: str(raw.source_label, 200),
  }
}

/** Checks rows without writing anything: fills in coordinates from map links, finds problems and duplicates. */
export async function check(rawRows: Record<string, unknown>[], defaults: ImportDefaults): Promise<CheckedRow[]> {
  const [regions, editions, sees, outlines, existing] = await Promise.all([
    listRegions(), listEditions(), listMetropolises(), regionBoundaries(),
    db.select({ id: schema.sites.id, slug: schema.sites.slug, lat: schema.sites.lat, lng: schema.sites.lng, content: schema.sites.content }).from(schema.sites),
  ])
  const known = existing.map((s) => {
    const c = normaliseContent(s.content)
    return { ...s, name: c.el.name || c.en.name, key: fold(`${c.el.name} ${c.en.name}`) }
  })
  const slugs = new Set(known.map((s) => s.slug))
  const out: CheckedRow[] = []
  // Looking up village centres takes a second each (the first time); stop after a few minutes — a second
  // check continues where this one stopped, since the results are remembered.
  const geocodeUntil = Date.now() + 4 * 60_000

  for (const [index, raw] of rawRows.slice(0, MAX_ROWS).entries()) {
    const row = clean(raw)
    const problems: string[] = []
    if ((row.lat == null || row.lng == null) && row.map_url) {
      const c = await resolveMapUrl(row.map_url)
      if (c) Object.assign(row, c)
      else problems.push("import.problem.mapUrl")
    }
    let region = row.region || defaults.region
    let r = regions.find((x) => x.id === region)
    const notes: string[] = []
    // No pin: the village or town centre, as an approximate location.
    if ((row.lat == null || row.lng == null) && (row.location_el || row.location_en) && r) {
      const countries = editions.find((x) => x.id === r!.edition)?.countries ?? []
      const place = (row.location_el || row.location_en || "").replace(/\s*\(.*?\)\s*/g, " ").split(",")[0]
      const hit = await geocodePlace(place, countries, geocodeUntil) ?? (row.location_en && row.location_el ? await geocodePlace(row.location_en, countries, geocodeUntil) : null)
      if (hit) {
        Object.assign(row, hit, { coords: "approximate" as const })
        notes.push("import.note.villageCentre")
      } else if (Date.now() > geocodeUntil) notes.push("import.note.checkAgain")
    }
    // A row that doesn't name its region goes to the region whose outline contains it (the innermost one).
    if (!row.region && row.lat != null && row.lng != null && r) {
      const inside = outlines.features.filter((f) => regions.find((x) => x.id === f.properties.region)?.edition === r!.edition
        && inGeometry(row.lat!, row.lng!, f.geometry as { type: string; coordinates: unknown }))
      const found = inside.find((f) => regions.find((x) => x.id === f.properties.region)?.parent) ?? inside[0]
      if (found && found.properties.region !== region) {
        region = found.properties.region
        r = regions.find((x) => x.id === region)
        notes.push("import.note.regionFromMap")
      }
    }
    const see = row.see || defaults.see
    if (!row.name_el && !row.name_en) problems.push("import.problem.name")
    if (!r) problems.push("import.problem.region")
    if (see && !sees.some((m) => m.slug === see)) problems.push("import.problem.see")
    if (row.lat == null || row.lng == null) problems.push("import.problem.noLocation")
    else if (r) {
      const [[s, w], [n, e]] = editions.find((x) => x.id === r.edition)?.bounds ?? r.bounds
      if (row.lat < s - 0.3 || row.lat > n + 0.3 || row.lng < w - 0.3 || row.lng > e + 0.3) problems.push("import.problem.outside")
    }

    // The address: English name (or the Greek one in latin letters) + the place.
    const shortName = row.name_el.replace(/^(Ιερ(ός|ά)\s+(Ναός|Μονή|Μονή)|Ι\.\s*[ΝΜ]\.)\s+/i, "")
    const base = slugify(`${row.name_en || greekToLatin(shortName)} ${row.location_en || greekToLatin(row.location_el ?? "")}`) || `church-${index + 1}`
    let slug = base
    for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`

    // Likely duplicates: the same address, or a church nearby with a similar name (or within 25 m).
    const key = fold(`${row.name_el} ${row.name_en}`)
    let duplicateOf: CheckedRow["duplicateOf"]
    const sameSlug = known.find((k) => k.slug === base)
    if (sameSlug) duplicateOf = { id: sameSlug.id, slug: sameSlug.slug, name: sameSlug.name, metres: null }
    if (!duplicateOf && row.lat != null && row.lng != null) {
      for (const k of known) {
        const m = distanceKm({ lat: row.lat, lng: row.lng! }, k) * 1000
        const similar = !!key && !!k.key && (k.key.includes(key) || key.includes(k.key))
        if (m < 25 || (m < 400 && similar)) { duplicateOf = { id: k.id, slug: k.slug, name: k.name, metres: Math.round(m) }; break }
      }
    }
    // …also within the same import.
    const twin = !duplicateOf && out.find((o) => o.status !== "error" && o.row.lat != null && row.lat != null
      && distanceKm({ lat: o.row.lat, lng: o.row.lng! }, { lat: row.lat, lng: row.lng! }) < 0.4 && fold(`${o.row.name_el} ${o.row.name_en}`) === key)
    if (twin) problems.push("import.problem.twin")

    const status = problems.some((p) => p !== "import.problem.twin") ? "error" : duplicateOf || twin ? "duplicate" : "ok"
    if (status !== "error") slugs.add(slug)
    out.push({ index, row, slug, region, see: see || null, status, problems, notes, duplicateOf })
  }
  return out
}

export type CommitResult = { added: { index: number; id: number; slug: string }[]; photos: number; photoErrors: number; failed: { index: number; error: string }[] }

/** Creates the given (already checked) rows. Re-checks each one first; rows that became errors are skipped. */
export async function commit(rawRows: Record<string, unknown>[], defaults: ImportDefaults, { allowDuplicates = false } = {}): Promise<CommitResult> {
  const checked = await check(rawRows, defaults)
  const sees = await listMetropolises()
  const result: CommitResult = { added: [], photos: 0, photoErrors: 0, failed: [] }
  for (const c of checked) {
    if (c.status === "error" || (c.status === "duplicate" && !allowDuplicates)) {
      result.failed.push({ index: c.index, error: c.status === "error" ? c.problems[0] : "import.problem.duplicate" })
      continue
    }
    const r = c.row
    const see = sees.find((m) => m.slug === c.see)
    const sourceLink = (lang: "el" | "en") => r.source ? `[${r.source_label || (see ? see.content[lang].name || see.content.el.name : new URL(r.source).hostname)}](${r.source})` : ""
    const content = normaliseContent({
      el: {
        name: r.name_el || r.name_en, location: r.location_el || "", summary: r.summary_el || "",
        body: "", facts: see ? `Μητρόπολη: ${see.content.el.name}` : "", sources: sourceLink("el"),
      },
      en: {
        // No made-up English name: the Greek shows until someone translates it (a contribution mission).
        name: r.name_en || "", location: r.location_en || greekToLatin(r.location_el ?? ""), summary: r.summary_en || "",
        body: "", facts: see ? `Metropolis: ${see.content.en.name || see.content.el.name}` : "", sources: sourceLink("en"),
      },
    })
    try {
      const id = await createSite({
        slug: c.slug, type: r.type ?? "church", region: c.region, lat: r.lat!, lng: r.lng!,
        coordsVerified: r.coords === "exact", published: defaults.published, content, metropolisId: see?.id ?? null,
      })
      result.added.push({ index: c.index, id, slug: c.slug })
      if (r.image) {
        try {
          const src = await rehostImage(r.image, c.slug)
          await addPhoto(id, { src, credit: r.source_label || see?.content.el.name || "", sourceUrl: r.source || r.image })
          result.photos++
        } catch (e) {
          result.photoErrors++
          console.warn(`import: photo for ${c.slug} failed:`, (e as Error).message)
        }
      }
    } catch (e) {
      console.error("import:", e)
      result.failed.push({ index: c.index, error: "error.generic" })
    }
  }
  return result
}
