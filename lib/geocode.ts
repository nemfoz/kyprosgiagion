import "server-only"
import { eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"

// Village / town → its centre, for imported churches without a pin of their own: they get an "approximate"
// location for contributors to correct. OpenStreetMap's Nominatim, used politely (one request a second, a
// User-Agent, results — also misses — remembered in the settings table under "geocode").
const KEY = "geocode"
type Hit = { lat: number; lng: number } | null

let cache: Record<string, Hit> | null = null
let last = 0

async function load() {
  if (cache) return cache
  const [row] = await db.select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, KEY))
  try { cache = row ? JSON.parse(row.value) : {} } catch { cache = {} }
  return cache!
}

async function save() {
  const value = JSON.stringify(cache)
  await db.insert(schema.settings).values({ key: KEY, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: sql`(datetime('now'))` } })
}

/** The centre of a place in the given countries (ISO codes), or null. `budget` stops new lookups after a deadline. */
export async function geocodePlace(place: string, countries: string[], deadline = Infinity): Promise<Hit> {
  const name = place.trim().replace(/\s+/g, " ")
  if (!name) return null
  const key = `${countries.join(",").toLowerCase()}|${name.toLocaleLowerCase("el")}`
  const c = await load()
  if (key in c) return c[key]
  if (Date.now() > deadline) return null
  const wait = last + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  last = Date.now()
  let hit: Hit = null
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.search = new URLSearchParams({ q: name, format: "jsonv2", limit: "1", "accept-language": "el", ...(countries.length ? { countrycodes: countries.join(",").toLowerCase() } : {}) }).toString()
    const res = await fetch(url, { headers: { "User-Agent": "Odoiporiko/1.0 (https://odoiporiko.com; church map importer)" }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null // don't remember failures of the service itself
    const [first] = (await res.json()) as { lat: string; lon: string }[]
    hit = first ? { lat: Math.round(Number(first.lat) * 1e6) / 1e6, lng: Math.round(Number(first.lon) * 1e6) / 1e6 } : null
  } catch {
    return null
  }
  c[key] = hit
  await save()
  return hit
}
