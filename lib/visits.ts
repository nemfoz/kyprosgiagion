import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { distanceKm } from "@/lib/geo"
import { siteSummaries, type SiteSummary } from "@/lib/sites"
import { publicMetropolises } from "@/lib/metropolises"
import { regionAncestors, regions } from "@/lib/regions"
import { CYPRUS, EDITIONS } from "@/lib/editions"
import { UserError } from "@/lib/session"

// A user's odoiporiko: the churches they have visited. "I'm here" checks the browser's location against the
// church (verified visit); "I've been here before" is taken on trust. The location itself is never stored.

const { visits, profiles, sites, user } = schema

/** How close (metres) "I'm here" must be; churches whose pin is only approximate allow more. */
export const CHECK_IN_RADIUS = 300
export const APPROX_RADIUS = 1500

/** The milestones shown on a profile (number of churches visited → interface text key). */
export const MILESTONES = [
  [1, "pfMilestone1"], [5, "pfMilestone5"], [10, "pfMilestone10"], [25, "pfMilestone25"], [50, "pfMilestone50"], [100, "pfMilestone100"],
] as const

export async function visitOf(userId: string, siteId: number) {
  const [row] = await db.select({ verified: visits.verified, visitedAt: visits.visitedAt }).from(visits)
    .where(and(eq(visits.userId, userId), eq(visits.siteId, siteId)))
  return row ?? null
}

export async function visitedIds(userId: string) {
  return (await db.select({ id: visits.siteId }).from(visits).where(eq(visits.userId, userId))).map((r) => r.id)
}

/**
 * Records a visit. With a position it is a check-in: refused when farther than the radius (allowing for the
 * phone's stated accuracy, up to 100 m), verified otherwise. A later check-in upgrades a manual visit.
 */
export async function markVisit(userId: string, siteId: number, at?: { lat: number; lng: number; accuracy: number }) {
  const [site] = await db.select({ lat: sites.lat, lng: sites.lng, coordsVerified: sites.coordsVerified, published: sites.published })
    .from(sites).where(eq(sites.id, siteId))
  if (!site?.published) throw new UserError("error.site.notFound")
  let verified = false
  if (at) {
    const metres = distanceKm(at, site) * 1000
    const radius = site.coordsVerified ? CHECK_IN_RADIUS : APPROX_RADIUS
    if (metres - Math.min(Math.max(at.accuracy, 0), 100) > radius) return { ok: false as const, metres, radius }
    verified = true
  }
  await db.insert(visits).values({ userId, siteId, verified }).onConflictDoUpdate({
    target: [visits.userId, visits.siteId],
    // Never downgrade a verified visit; a check-in also refreshes the date.
    set: verified ? { verified: true, visitedAt: sql`(datetime('now'))` } : { verified: sql`${visits.verified}` },
  })
  return { ok: true as const, verified }
}

export async function removeVisit(userId: string, siteId: number) {
  await db.delete(visits).where(and(eq(visits.userId, userId), eq(visits.siteId, siteId)))
}

export async function isPublicProfile(userId: string) {
  const [row] = await db.select({ public: profiles.public }).from(profiles).where(eq(profiles.userId, userId))
  return !!row?.public
}

export async function setPublicProfile(userId: string, on: boolean) {
  await db.insert(profiles).values({ userId, public: on })
    .onConflictDoUpdate({ target: profiles.userId, set: { public: on, updatedAt: sql`(datetime('now'))` } })
}

type Tally = { id: string; visited: number; total: number }
const tally = (all: SiteSummary[], seen: Set<number>, key: (s: SiteSummary) => string[]) => {
  const m = new Map<string, Tally>()
  for (const s of all) {
    for (const k of key(s)) {
      const t = m.get(k) ?? { id: k, visited: 0, total: 0 }
      t.total++
      if (seen.has(s.id)) t.visited++
      m.set(k, t)
    }
  }
  return m
}

/** A user's visits with the counts: overall, by country (edition), region and see — "X of Y". */
export async function odoiporiko(userId: string) {
  const [rows, all, metros] = await Promise.all([
    db.select({ siteId: visits.siteId, verified: visits.verified, visitedAt: visits.visitedAt }).from(visits)
      .where(eq(visits.userId, userId)).orderBy(desc(visits.visitedAt)),
    siteSummaries(),
    publicMetropolises(),
  ])
  const byId = new Map(all.map((s) => [s.id, s]))
  const list = rows.flatMap((v) => (byId.has(v.siteId) ? [{ ...v, site: byId.get(v.siteId)! }] : []))
  const seen = new Set(list.map((v) => v.siteId))
  const byRegion = tally(all, seen, (s) => regionAncestors(s.region))
  const bySee = tally(all, seen, (s) => (s.metropolisId ? [String(s.metropolisId)] : []))
  return {
    visited: list.length,
    verified: list.filter((v) => v.verified).length,
    total: all.length,
    list,
    // Every region belongs to the Cyprus edition for now; the other Churches have no churches yet.
    countries: EDITIONS.filter((e) => e.active).map((e) => ({ edition: e, visited: e.id === CYPRUS.id ? list.length : 0, total: e.id === CYPRUS.id ? all.length : 0 })),
    regions: regions.filter((r) => byRegion.has(r.id)).map((r) => ({ region: r, ...byRegion.get(r.id)! })),
    sees: metros.filter((m) => bySee.has(String(m.id))).map((m) => ({ see: m, ...bySee.get(String(m.id))! }))
      .sort((a, b) => b.visited - a.visited || b.total - a.total),
  }
}

/** The account behind a public profile, or null when it doesn't exist or isn't public. */
export async function publicProfileUser(userId: string) {
  const [row] = await db.select({ id: user.id, name: user.name, banned: user.banned, public: profiles.public })
    .from(user).innerJoin(profiles, eq(profiles.userId, user.id)).where(eq(user.id, userId))
  return row && row.public && !row.banned ? row : null
}
