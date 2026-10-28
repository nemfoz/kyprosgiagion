import "server-only"
import { and, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { badgesFor, completeness, levelFor, nextLevel, publicName, TOTAL_POINTS } from "@/lib/completeness"
import { getPointsConfig } from "@/lib/points"
import { listSites } from "@/lib/sites"
import { cached } from "@/lib/cache"

const { submissions, user, photos } = schema

/** Points, rank, level and badges of one contributor (from approved proposals). */
export async function contributorStats(userId: string) {
  const cfg = await getPointsConfig()
  const rows = await db.select({ points: submissions.points, completed: submissions.completed })
    .from(submissions).where(and(eq(submissions.authorId, userId), eq(submissions.status, "approved")))
  const points = rows.reduce((n, r) => n + r.points, 0)
  const completed = rows.flatMap((r) => JSON.parse(r.completed) as string[])
  const [{ ahead }] = await db.select({ ahead: sql<number>`COUNT(*)` }).from(
    db.select({ total: sql<number>`SUM(${submissions.points})`.as("total") }).from(submissions)
      .where(eq(submissions.status, "approved")).groupBy(submissions.authorId)
      .having(sql`SUM(${submissions.points}) > ${points}`).as("t"),
  )
  return {
    points,
    approved: rows.length,
    rank: points > 0 ? Number(ahead) + 1 : null,
    level: levelFor(cfg, points),
    next: nextLevel(cfg, points),
    badges: badgesFor(rows.length, completed),
  }
}

/** Top contributors by points; names shortened for public display ("Μαρία Τ."). */
export async function leaderboard(limit = 10) {
  const cfg = await getPointsConfig()
  const rows = await db.select({
    userId: submissions.authorId,
    name: user.name,
    points: sql<number>`SUM(${submissions.points})`,
    approved: sql<number>`COUNT(*)`,
    completed: sql<string>`json_group_array(${submissions.completed})`,
  }).from(submissions).innerJoin(user, eq(user.id, submissions.authorId))
    .where(eq(submissions.status, "approved"))
    .groupBy(submissions.authorId)
    .orderBy(sql`SUM(${submissions.points}) DESC`)
    .limit(limit)
  return rows.map((r) => {
    const completed = (JSON.parse(r.completed) as string[]).flatMap((c) => JSON.parse(c) as string[])
    return {
      userId: r.userId, name: publicName(r.name), points: Number(r.points), approved: Number(r.approved),
      level: levelFor(cfg, Number(r.points)), badges: badgesFor(Number(r.approved), completed),
    }
  })
}

/** Every published church with its completeness, least complete first. */
/** The board and leaderboard as the public pages see them, cached across requests (approvals expire them). */
export const publicMissionBoard = cached("missionBoard", () => missionBoard())
export const publicLeaderboard = cached("leaderboard", (limit: number) => leaderboard(limit))

export async function missionBoard() {
  const [sites, cfg] = await Promise.all([listSites({ publishedOnly: true }), getPointsConfig()])
  const counts = await db.select({ siteId: photos.siteId, n: sql<number>`COUNT(*)` }).from(photos).groupBy(photos.siteId)
  const photoCount = new Map(counts.map((c) => [c.siteId, Number(c.n)]))
  const board = sites.map((s) => {
    const c = completeness({ content: s.content, coordsVerified: s.coordsVerified, photoCount: photoCount.get(s.id) ?? 0 }, cfg)
    return {
      id: s.id, slug: s.slug, type: s.type, cover: s.cover,
      name: { el: s.content.el.name, en: s.content.en.name },
      location: { el: s.content.el.location, en: s.content.en.location },
      percent: c.percent, byLang: c.byLang, missing: c.missing.map((m) => m.key), missingPoints: c.missing.reduce((n, m) => n + m.points, 0),
    }
  }).sort((a, b) => a.percent - b.percent || b.missingPoints - a.missingPoints)
  const earned = board.reduce((n, s) => n + (TOTAL_POINTS - s.missingPoints), 0)
  return {
    sites: board,
    overall: board.length ? Math.round((earned / (board.length * TOTAL_POINTS)) * 100) : 0,
    complete: board.filter((s) => s.percent === 100).length,
  }
}
