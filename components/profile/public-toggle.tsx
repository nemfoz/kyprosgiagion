"use client"

import { useState, useTransition } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@/components/i18n-provider"
import { setPublicProfileAction } from "@/app/visit-actions"
import type { Locale } from "@/lib/locales"

/** The switch for a public profile, with the link to share once it is on. */
export function PublicToggle({ initial, lang, href }: { initial: boolean; lang: Locale; href: string }) {
  const t = useT()
  const [on, setOn] = useState(initial)
  const [pending, start] = useTransition()
  const url = typeof window === "undefined" ? href : new URL(href, location.origin).href
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4">
      <label className="flex items-center justify-between gap-4">
        <span className="font-heading text-base font-bold">{t("pfPublic", lang)}</span>
        <Switch checked={on} disabled={pending} onCheckedChange={(v) => start(async () => { const r = await setPublicProfileAction(v); if (r.ok) setOn(v) })} />
      </label>
      <p className="text-xs text-muted-foreground">{on ? t("pfPublicText", lang) : t("pfPrivate", lang)}</p>
      {on && (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs" suppressHydrationWarning>{url}</code>
          <Button size="sm" variant="outline" aria-label={t("pfPublicLink", lang)}
            onClick={() => navigator.clipboard?.writeText(url).then(() => toast.success(t("linkCopied", lang)))}><Copy /></Button>
        </div>
      )}
    </div>
  )
}
