"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ADMIN_LANG_COOKIE, type Overrides } from "@/lib/i18n"
import { getAdminT, saveOverrides } from "@/lib/i18n-server"
import { assertRole, Forbidden } from "@/lib/session"

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
