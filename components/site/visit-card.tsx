"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleCheck, Footprints, History, Loader2, LocateFixed, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useT } from "@/components/i18n-provider"
import { markVisitAction, removeVisitAction } from "@/app/visit-actions"
import { formatDistance } from "@/lib/geo"
import { intlLocale, localePath, type Locale } from "@/lib/locales"

type Visit = { verified: boolean; visitedAt: string } | null

/**
 * "Have you been here?" on a church page: check in with the phone's location (verified, within `radius` m),
 * or mark an earlier visit. Visitors who aren't signed in are invited to sign in.
 */
export function VisitCard({ siteId, lang, signedIn, initial, radius }: {
  siteId: number; lang: Locale; signedIn: boolean; initial: Visit; radius: number
}) {
  const t = useT()
  const pathname = usePathname()
  const [visit, setVisit] = useState<Visit>(initial)
  const [locating, setLocating] = useState(false)
  const [pending, start] = useTransition()
  const busy = locating || pending

  if (!signedIn) {
    return (
      <Card className="gap-2 py-4">
        <CardHeader className="px-4"><CardTitle className="flex items-center gap-2 font-heading text-base"><Footprints className="size-4 text-gold-deep" />{t("visitTitle", lang)}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 px-4 text-[13px]">
          <p className="text-muted-foreground">{t("visitSignIn", lang)}</p>
          <Button asChild size="sm" variant="outline"><Link href={localePath(`/login?next=${encodeURIComponent(pathname)}`, lang)}>{t("signIn", lang)}</Link></Button>
        </CardContent>
      </Card>
    )
  }

  const save = (at?: { lat: number; lng: number; accuracy: number }) => start(async () => {
    const r = await markVisitAction(siteId, at)
    if (r.ok) {
      setVisit((v) => ({ verified: !!r.verified || !!v?.verified, visitedAt: r.verified || !v ? new Date().toISOString() : v.visitedAt }))
      toast.success(t(r.verified ? "visitVerifiedSaved" : "visitSaved", lang))
    } else if (r.error === "visitTooFar") {
      toast.error(t("visitTooFar", lang, { d: formatDistance((r.metres ?? 0) / 1000, lang), m: r.radius ?? radius }))
    } else toast.error(t(r.error, lang))
  })

  const checkIn = () => {
    if (!navigator.geolocation) { toast.error(t("locateFailed", lang)); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); save({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }) },
      () => { setLocating(false); toast.error(t("locateFailed", lang)) },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }

  const remove = () => start(async () => {
    const r = await removeVisitAction(siteId)
    if (r.ok) setVisit(null)
  })

  const date = visit && new Intl.DateTimeFormat(intlLocale(lang), { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(visit.visitedAt.includes("T") ? visit.visitedAt : `${visit.visitedAt.replace(" ", "T")}Z`))

  return (
    <Card className={`gap-2 py-4 ${visit ? "border-primary/30 bg-accent/40" : ""}`}>
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          {visit ? <CircleCheck className="size-4 text-primary" /> : <Footprints className="size-4 text-gold-deep" />}
          {visit ? t("visitDone", lang) : t("visitTitle", lang)}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-4 text-[13px]">
        {visit && (
          <p className="text-muted-foreground">
            {visit.verified ? t("visitVerified", lang) : t("visitUnverified", lang)} · {date}
          </p>
        )}
        {!visit?.verified && (
          <>
            <Button size="sm" onClick={checkIn} disabled={busy} className="max-md:h-10">
              {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}{locating ? t("visitChecking", lang) : t("visitCheckIn", lang)}
            </Button>
            <p className="text-xs text-muted-foreground">{t("visitCheckInHint", lang, { m: radius })}</p>
          </>
        )}
        {!visit && (
          <Button size="sm" variant="outline" onClick={() => save()} disabled={busy} className="max-md:h-10"><History />{t("visitManual", lang)}</Button>
        )}
        {visit && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={localePath("/profile", lang)} className="text-xs text-primary underline underline-offset-2">{t("myOdoiporiko", lang)}</Link>
            <Button size="sm" variant="ghost" onClick={remove} disabled={busy} className="h-8 text-xs text-muted-foreground"><X />{t("visitRemove", lang)}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
