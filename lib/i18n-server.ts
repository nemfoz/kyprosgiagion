import "server-only"
import { cache } from "react"
import { cookies, headers } from "next/headers"
import { eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import type { Lang } from "@/lib/content"
import { EXTRA_LOCALES, type ExtraLocale } from "@/lib/locales"
import { LOCALE_MESSAGES } from "@/lib/messages/locales"
import { ADMIN_LANG_COOKIE, bindLang, makeT, MESSAGES, setDataOverrides, type Overrides } from "@/lib/i18n"

const { settings } = schema

/** Superadmin edits to the interface text. Read once per request. */
export const getOverrides = cache(async (): Promise<Overrides> => {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, "translations"))
  const o: Overrides = row ? JSON.parse(row.value) : {}
  setDataOverrides(o)
  return o
})

export async function getT() {
  return makeT(await getOverrides())
}

/** The admin area's language: the cookie, else Greek for browsers set to Greek and English for everyone else. */
export const getAdminLang = cache(async (): Promise<Lang> => {
  const cookie = (await cookies()).get(ADMIN_LANG_COOKIE)?.value
  if (cookie === "en" || cookie === "el") return cookie
  return /^\s*el\b/i.test((await headers()).get("accept-language") ?? "el") ? "el" : "en"
})

export async function getAdminT() {
  const [t, lang] = await Promise.all([getT(), getAdminLang()])
  return bindLang(t, lang)
}

async function writeOverrides(o: Overrides, userId: string) {
  const value = JSON.stringify(o)
  await db.insert(settings).values({ key: "translations", value, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId, updatedAt: sql`(datetime('now'))` } })
  setDataOverrides(o)
}

/**
 * Saves the Greek and English overrides (the /admin/translations editor); empty values and values equal to the
 * default are dropped. Texts in the other languages are kept as they are.
 */
export async function saveOverrides(input: Overrides, userId: string) {
  const clean: Overrides = {}
  for (const [key, v] of Object.entries(await getOverrides())) {
    for (const l of EXTRA_LOCALES) if (v?.[l]) (clean[key] ??= {})[l] = v[l]
  }
  let count = 0
  for (const [key, v] of Object.entries(input)) {
    const def = MESSAGES[key as keyof typeof MESSAGES]
    if (!def || !v) continue
    for (const lang of ["el", "en"] as const) {
      const text = String(v[lang] ?? "").trim().slice(0, 2000)
      if (text && text !== def[lang]) { (clean[key] ??= {})[lang] = text; count++ }
    }
  }
  await writeOverrides(clean, userId)
  return count
}

/** Sets one text in an extra language (an approved fix or a superadmin's edit); "" or the draft removes it. */
export async function setLocaleText(key: string, locale: ExtraLocale, text: string, userId: string) {
  const o = structuredClone(await getOverrides())
  const clean = text.trim().slice(0, 2000)
  if (clean && clean !== LOCALE_MESSAGES[locale][key]) (o[key] ??= {})[locale] = clean
  else if (o[key]) {
    delete o[key][locale]
    if (!Object.keys(o[key]).length) delete o[key]
  }
  await writeOverrides(o, userId)
}
