"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n-provider"
import { isLocale, localePath, type Locale } from "@/lib/locales"

const KEY = "cookieNotice"
const EVENT = "cookie-notice"

// Whether the notice was dismissed, read from local storage (on the server and when storage is blocked: yes).
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb) }
}
const dismissed = () => { try { return !!localStorage.getItem(KEY) } catch { return true } }

/**
 * The cookie notice: only essential cookies are used, so it informs rather than asks for consent.
 * Shown once per browser (remembered in local storage); never in the admin area.
 */
export function CookieNotice() {
  const t = useT()
  const pathname = usePathname()
  const hidden = useSyncExternalStore(subscribe, dismissed, () => true)
  if (hidden || pathname.startsWith("/admin")) return null
  const prefix = pathname.split("/")[1]
  const lang: Locale = isLocale(prefix) ? prefix : "el"
  const close = () => { try { localStorage.setItem(KEY, "1") } catch {} window.dispatchEvent(new Event(EVENT)) }
  return (
    <div role="region" aria-label="Cookies" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card/95 p-3 text-sm shadow-lg backdrop-blur md:p-4">
      <p className="min-w-0 flex-1 basis-64">{t("cookieText", lang)}</p>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link href={localePath("/cookies", lang)} onClick={close}>{t("cookieMore", lang)}</Link></Button>
        <Button size="sm" onClick={close}>{t("cookieOk", lang)}</Button>
      </div>
    </div>
  )
}
