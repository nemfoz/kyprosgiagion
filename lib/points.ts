import "server-only"
import { cache } from "react"
import { eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { UserError } from "@/lib/session"
import { normalisePoints, normaliseEarned, proposalPoints, validatePoints, type PointsConfig } from "@/lib/completeness"

const { settings, submissions } = schema

/** The point values in force (defaults until a superadmin changes them). Read once per request. */
export const getPointsConfig = cache(async (): Promise<PointsConfig> => {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, "points"))
  return normalisePoints(row ? JSON.parse(row.value) : null)
})

/**
 * Saves new point values and recalculates every approved proposal with them,
 * so totals, ranks, titles and the leaderboard all follow the new values. Returns how many were recalculated.
 */
export async function savePointsConfig(raw: unknown, userId: string) {
  const cfg = normalisePoints(raw)
  const errors = validatePoints(cfg)
  if (errors.length) throw new UserError(errors)
  const value = JSON.stringify(cfg)
  await db.insert(settings).values({ key: "points", value, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId, updatedAt: sql`(datetime('now'))` } })

  const approved = await db.select({ id: submissions.id, completed: submissions.completed })
    .from(submissions).where(eq(submissions.status, "approved"))
  const updates = approved.map((s) => {
    const completed = normaliseEarned(JSON.parse(s.completed) as string[])
    return db.update(submissions).set({ points: proposalPoints(cfg, completed), completed: JSON.stringify(completed) })
      .where(eq(submissions.id, s.id))
  })
  if (updates.length) await db.batch(updates as [typeof updates[number], ...typeof updates])
  return approved.length
}
