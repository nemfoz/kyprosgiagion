// Interface text in Greek and English. The defaults live in lib/messages/*; superadmins can override
// any of them at /admin/translations (stored in the `settings` table, see lib/i18n-server.ts).
//
//   server:  const t = await getT();        t("details", lang)       (lib/i18n-server.ts)
//            const t = await getAdminT();   t("admin.nav.sites")     (admin language from a cookie)
//   client:  const t = useT();              const t = useAdminT();   (components/i18n-provider.tsx)
//
// "{name}" placeholders are filled from the third (or, for admin text, second) argument.
import type { Lang } from "@/lib/content"
import { PUBLIC } from "@/lib/messages/public"
import { ADMIN } from "@/lib/messages/admin"
import { EDITOR } from "@/lib/messages/editor"
import { AUTH } from "@/lib/messages/auth"
import { SHELL } from "@/lib/messages/shell"

export type Message = Record<Lang, string>
export type Vars = Record<string, string | number>
export type Overrides = Partial<Record<string, Partial<Message>>>

export const MESSAGE_GROUPS = { public: PUBLIC, admin: { ...ADMIN, ...SHELL }, editor: EDITOR, auth: AUTH }
export const MESSAGES = { ...PUBLIC, ...ADMIN, ...SHELL, ...EDITOR, ...AUTH }
export type MessageKey = keyof typeof MESSAGES

const format = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s)

/** A translate function using the given overrides on top of the defaults. */
export function makeT(overrides: Overrides = {}) {
  return (key: MessageKey, lang: Lang, vars?: Vars): string => {
    const m = MESSAGES[key] as Message | undefined
    return format(overrides[key]?.[lang] || m?.[lang] || m?.el || key, vars)
  }
}
export type TFn = ReturnType<typeof makeT>

/** Admin text in the admin's chosen language; `lang` tells components which language that is. */
export type AdminT = ((key: MessageKey, vars?: Vars) => string) & { lang: Lang }
export const bindLang = (t: TFn, lang: Lang): AdminT => Object.assign((key: MessageKey, vars?: Vars) => t(key, lang, vars), { lang })

/** Defaults only — for places that can't see the overrides (e-mails, error messages deep in lib code). */
export const t = makeT()

export const langFrom = (v: unknown): Lang => (v === "en" ? "en" : "el")
export const ADMIN_LANG_COOKIE = "admin_lang"
