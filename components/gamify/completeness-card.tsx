import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PAGE_POINTS, type BonusKey, type ScoredMission } from "@/lib/completeness"
import { LANGS, type Lang } from "@/lib/content"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", percent === 100 ? "bg-crimson" : "bg-gold")} style={{ width: `${percent}%` }} />
    </div>
  )
}

const LANG_NAMES: Record<Lang, Record<Lang, string>> = { el: { el: "Ελληνικά", en: "Greek" }, en: { el: "Αγγλικά", en: "English" } }

/** Shown on church pages to signed-in users: how complete the page is in each language and what's missing. */
export function CompletenessCard({ score, bonuses, siteId, lang }: {
  score: { percent: number; byLang: Record<Lang, number>; missing: ScoredMission[] }
  bonuses: Record<BonusKey, number>; siteId: number; lang: Lang
}) {
  const { percent, byLang, missing } = score
  return (
    <Card id="contribute" className={cn("gap-3 py-4", percent < 100 && "border-gold/50")}>
      <CardHeader className="gap-2 px-4">
        <CardTitle className="flex items-center justify-between font-heading text-base">
          {t("completeness", lang)}<span className="font-sans text-sm font-semibold text-gold-deep">{percent}%</span>
        </CardTitle>
        <div className="grid gap-1.5 text-xs">
          {LANGS.map((l) => (
            <div key={l} className="grid gap-1">
              <span className="flex justify-between text-muted-foreground"><span>{LANG_NAMES[l][lang]}</span><span>{byLang[l]} / {PAGE_POINTS}</span></span>
              <ProgressBar percent={byLang[l]} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2.5 px-4 text-[13px]">
        {percent === 100 ? (
          <p className="flex gap-2 text-muted-foreground"><Check className="size-4 shrink-0 text-crimson" />{t("completeAll", lang)}</p>
        ) : (
          <>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t("missingTitle", lang)}</p>
            <ul className="grid gap-1.5">
              {missing.map((m) => (
                <li key={m.key} className="flex items-start justify-between gap-3">
                  <span title={m.hint[lang]}>{m.label[lang]}</span>
                  <span className="shrink-0 rounded-full bg-accent px-1.5 text-xs font-semibold text-primary">+{m.points}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {lang === "el"
            ? `Μπόνους: +${bonuses.extra_photo} ανά επιπλέον φωτογραφία, +${bonuses.historic_photo} ανά παλιά φωτογραφία, +${bonuses.video} ανά βίντεο.`
            : `Bonus: +${bonuses.extra_photo} per additional photo, +${bonuses.historic_photo} per old photo, +${bonuses.video} per video.`}
        </p>
        <Button asChild size="sm"><Link href={`/admin/sites/${siteId}`}><Sparkles />{t("helpComplete", lang)}</Link></Button>
        <Link href={`/contribute${lang === "en" ? "?lang=en" : ""}`} className="text-center text-xs text-muted-foreground underline">
          {lang === "el" ? "Πώς λειτουργούν οι πόντοι" : "How points work"}
        </Link>
      </CardContent>
    </Card>
  )
}
