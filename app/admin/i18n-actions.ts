"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ADMIN_LANG_COOKIE, type Overrides } from "@/lib/i18n"
import { getAdminT, saveOverrides, setLocaleText } from "@/lib/i18n-server"
import { EXTRA_LOCALES, type ExtraLocale } from "@/lib/locales"
import { assertRole, Forbidden, UserError } from "@/lib/session"
import { translatableTexts } from "@/lib/translatable"
import { reviewSuggestion, suggestTranslation } from "@/lib/translations"

type Result = { ok: true } | { ok: false; error: string }

/** Runs an action, turning errors into a translated message. */
async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn()
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (e) {
    const t = await getAdminT()
    if (e instanceof UserError) return { ok: false, error: e.messages.map((m) => t(m.key, m.vars)).join(" ") }
    console.error(e)
    return { ok: false, error: t("admin.translations.failed") }
  }
}

/** Signed-in users: suggest a better text in one of the extra languages. */
export async function suggestTranslationAction(key: string, locale: string, text: string, note: string) {
  return run(async () => {
    const user = await assertRole("approved")
    await suggestTranslation({ key, locale, text, note }, user.id)
  })
}

/** Admins: approve (with an optional edit) or reject a suggestion. */
export async function reviewSuggestionAction(id: number, approve: boolean, text?: string) {
  return run(async () => {
    const user = await assertRole("admin")
    await reviewSuggestion(id, approve, user.id, text)
  })
}

/** Superadmins: edit a text in an extra language directly. */
export async function setLocaleTextAction(key: string, locale: string, text: string) {
  return run(async () => {
    const user = await assertRole("superadmin")
    if (!EXTRA_LOCALES.includes(locale as ExtraLocale) || !translatableTexts().some((x) => x.key === key)) throw new UserError("error.translation.unknown")
    await setLocaleText(key, locale as ExtraLocale, text, user.id)
  })
}

/** Remembers the admin area's language for this browser. */
export async function setAdminLangAction(lang: "el" | "en") {
  (await cookies()).set(ADMIN_LANG_COOKIE, lang === "en" ? "en" : "el", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
  revalidatePath("/", "layout")
}

/** Superadmins: saves the interface text overrides. */
export async function saveTranslationsAction(overrides: Overrides): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const user = await assertRole("superadmin")
    const count = await saveOverrides(overrides, user.id)
    revalidatePath("/", "layout")
    return { ok: true, count }
  } catch (e) {
    if (e instanceof Forbidden) return { ok: false, error: e.message }
    console.error(e)
    return { ok: false, error: (await getAdminT())("admin.translations.failed") }
  }
}
