// Interface text. Greek and English defaults live in lib/messages/*, the other public languages in
// lib/messages/locales/* (missing text falls back to English, then Greek). Superadmins can override any of
// them at /admin/translations (stored in the `settings` table, see lib/i18n-server.ts); users can suggest fixes.
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
import { LOCALE_MESSAGES } from "@/lib/messages/locales"
import { fallbacks, isExtra, isLocale, tr, type Locale } from "@/lib/locales"

export type Message = Record<Lang, string>
export type Vars = Record<string, string | number>
export type Overrides = Partial<Record<string, Partial<Record<Locale, string>>>>

export const MESSAGE_GROUPS = { public: PUBLIC, admin: { ...ADMIN, ...SHELL }, editor: EDITOR, auth: AUTH }
export const MESSAGES = { ...PUBLIC, ...ADMIN, ...SHELL, ...EDITOR, ...AUTH }
export type MessageKey = keyof typeof MESSAGES

const format = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s)

/** A translate function using the given overrides on top of the defaults. */
export function makeT(overrides: Overrides = {}) {
  return (key: MessageKey, lang: Locale, vars?: Vars): string => {
    const m = MESSAGES[key] as Message | undefined
    for (const l of fallbacks(lang)) {
      const text = overrides[key]?.[l] || (l === "el" || l === "en" ? m?.[l] : LOCALE_MESSAGES[l][key])
      if (text) return format(text, vars)
    }
    return key
  }
}
export type TFn = ReturnType<typeof makeT>

/** Admin text in the admin's chosen language; `lang` tells components which language that is. */
export type AdminT = ((key: MessageKey, vars?: Vars) => string) & { lang: Lang }
export const bindLang = (t: TFn, lang: Lang): AdminT => Object.assign((key: MessageKey, vars?: Vars) => t(key, lang, vars), { lang })

/** Defaults only — for places that can't see the overrides (e-mails, error messages deep in lib code). */
export const t = makeT()

/** The page language from ?lang= (set by proxy.ts from the /en/, /ru/… prefix); Greek by default. */
export const langFrom = (v: unknown): Locale => (isLocale(v) ? v : "el")
export const ADMIN_LANG_COOKIE = "admin_lang"

/**
 * A label kept as data with Greek and English ({el, en} records: church types, badges, regions…) in any
 * language: the extra languages read it from lib/messages/locales under `key` (e.g. "data.type.church").
 */
export function trData(key: string, record: Partial<Record<Locale, string>> | undefined, lang: Locale) {
  return (isExtra(lang) && (dataOverrides[key]?.[lang] || LOCALE_MESSAGES[lang][key])) || tr(record, lang)
}

// Overrides of the data labels in the extra languages (approved fixes). They are the same for every visitor, so
// the server (getOverrides) and the browser (I18nProvider) simply keep the latest copy here for trData.
let dataOverrides: Overrides = {}
export const setDataOverrides = (o: Overrides) => { dataOverrides = o }
