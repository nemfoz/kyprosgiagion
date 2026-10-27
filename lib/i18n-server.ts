import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import type { Lang } from "@/lib/content"
import { ADMIN_LANG_COOKIE, bindLang, makeT, MESSAGES, type Overrides } from "@/lib/i18n"

const { settings } = schema

/** Superadmin edits to the interface text. Read once per request. */
export const getOverrides = cache(async (): Promise<Overrides> => {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, "translations"))
  return row ? JSON.parse(row.value) : {}
})

export async function getT() {
  return makeT(await getOverrides())
}

/** The admin area's language (a cookie, Greek by default). */
export const getAdminLang = cache(async (): Promise<Lang> =>
  (await cookies()).get(ADMIN_LANG_COOKIE)?.value === "en" ? "en" : "el")

export async function getAdminT() {
  const [t, lang] = await Promise.all([getT(), getAdminLang()])
  return bindLang(t, lang)
}

/** Saves overrides; empty values and values equal to the default are dropped. */
export async function saveOverrides(input: Overrides, userId: string) {
  const clean: Overrides = {}
  for (const [key, v] of Object.entries(input)) {
    const def = MESSAGES[key as keyof typeof MESSAGES]
    if (!def || !v) continue
    for (const lang of ["el", "en"] as const) {
      const text = String(v[lang] ?? "").trim().slice(0, 2000)
      if (text && text !== def[lang]) (clean[key] ??= {})[lang] = text
    }
  }
  const value = JSON.stringify(clean)
  await db.insert(settings).values({ key: "translations", value, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId, updatedAt: sql`(datetime('now'))` } })
  return Object.keys(clean).length
}
