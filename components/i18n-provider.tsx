"use client"

import { createContext, useContext, useMemo } from "react"
import type { Lang } from "@/lib/content"
import { bindLang, makeT, setDataOverrides, type AdminT, type Overrides, type TFn } from "@/lib/i18n"

const OverridesContext = createContext<Overrides>({})
const AdminLangContext = createContext<Lang>("el")

/** Root layout: makes the superadmin's text overrides available to client components. */
export function I18nProvider({ overrides, children }: { overrides: Overrides; children: React.ReactNode }) {
  setDataOverrides(overrides) // for trData (labels kept as data) in client components
  return <OverridesContext.Provider value={overrides}>{children}</OverridesContext.Provider>
}

/** Admin layout: the admin area's language. */
export function AdminLangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <AdminLangContext.Provider value={lang}>{children}</AdminLangContext.Provider>
}

/** t(key, lang, vars?) for public components that switch language themselves. */
export function useT(): TFn {
  const overrides = useContext(OverridesContext)
  return useMemo(() => makeT(overrides), [overrides])
}

/** t(key, vars?) in the admin language; t.lang is that language. */
export function useAdminT(): AdminT {
  const t = useT()
  const lang = useContext(AdminLangContext)
  return useMemo(() => bindLang(t, lang), [t, lang])
}
