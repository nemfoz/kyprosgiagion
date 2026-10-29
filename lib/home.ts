import "server-only"
import fs from "node:fs"
import path from "node:path"
import { sql } from "drizzle-orm"
import { cached } from "@/lib/cache"
import { inGeometry } from "@/lib/geo"
import { db, schema } from "@/lib/db"
import { getEditions } from "@/lib/editions-server"
import { publicLeaderboard } from "@/lib/contributors"
import { publicMetropolises } from "@/lib/metropolises"
import { getRegions } from "@/lib/regions-server"
import { siteSummaries } from "@/lib/sites"

// What the home page shows: the editions with their numbers, a few churches with photos, and how much of the
// record is in the occupied areas of Cyprus.

let occupied: GeoJSON.Geometry[] | null = null
/** Whether a point lies in the occupied areas of Cyprus (public/data/occupied.geojson). */
export function isOccupied(lat: number, lng: number) {
  if (!occupied) {
    try { occupied = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/occupied.geojson"), "utf8")).features.map((f: GeoJSON.Feature) => f.geometry) }
    catch { occupied = [] }
  }
  return occupied!.some((g) => inGeometry(lat, lng, g as { type: string; coordinates: unknown }))
}

export const homeData = cached("home", async () => {
  const [editions, regions, sites, sees, board, [photos]] = await Promise.all([
    getEditions(), getRegions(), siteSummaries(), publicMetropolises(), publicLeaderboard(50),
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.photos).innerJoin(schema.sites, sql`${schema.sites.id} = ${schema.photos.siteId} AND ${schema.sites.published} = 1`),
  ])
  const perEdition = editions.map((e) => ({
    edition: e,
    churches: sites.filter((s) => s.edition === e.id).length,
    sees: sees.filter((m) => m.edition === e.id).length,
    regions: regions.filter((r) => r.edition === e.id && r.active).length,
  }))
  const withPhoto = sites.filter((s) => s.cover)
  return {
    editions: perEdition,
    totals: {
      churches: sites.length,
      photos: Number(photos?.n ?? 0),
      occupied: sites.filter((s) => s.edition === "cyprus" && isOccupied(s.lat, s.lng)).length,
      contributors: board.length,
      sees: sees.length,
    },
    featured: [...withPhoto.filter((s) => s.coordsVerified), ...withPhoto.filter((s) => !s.coordsVerified)].slice(0, 12),
    recent: [...sites].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
  }
}, 900)
export type HomeData = Awaited<ReturnType<typeof homeData>>
