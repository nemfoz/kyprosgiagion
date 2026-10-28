import "server-only"
import { cache } from "react"
import { eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { cached } from "@/lib/cache"
import { normaliseInfo, type SiteInfo } from "@/lib/pages"

const { settings } = schema

/** The footer details and information page texts (lib/pages.ts), cached across requests; saving expires it. */
export const getSiteInfo = cache(cached("siteInfo", async (): Promise<SiteInfo> => {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, "pages"))
  return normaliseInfo(row ? JSON.parse(row.value) : null)
}))

export async function saveSiteInfo(raw: unknown, userId: string) {
  const info = { ...normaliseInfo(raw), updatedAt: new Date().toISOString().slice(0, 10) }
  const value = JSON.stringify(info)
  await db.insert(settings).values({ key: "pages", value, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId, updatedAt: sql`(datetime('now'))` } })
  return info
}
