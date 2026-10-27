import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MISSIONS, type MissionKey } from "@/lib/completeness"
import type { Lang } from "@/lib/content"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", percent === 100 ? "bg-crimson" : "bg-gold")} style={{ width: `${percent}%` }} />
    </div>
  )
}

/** Shown on every church page: how complete it is and what visitors can add. */
export function CompletenessCard({ percent, done, siteId, lang, signedIn }: {
  percent: number; done: MissionKey[]; siteId: number; lang: Lang; signedIn: boolean
}) {
  const missing = MISSIONS.filter((m) => !done.includes(m.key))
  const href = signedIn ? `/admin/sites/${siteId}` : `/login?next=${encodeURIComponent(`/admin/sites/${siteId}`)}`
  return (
    <Card id="contribute" className={cn(percent < 100 && "border-gold/50")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between font-heading text-lg">
          {t("completeness", lang)}<span className="font-sans text-base font-semibold text-gold-deep">{percent}%</span>
        </CardTitle>
        <ProgressBar percent={percent} />
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {percent === 100 ? (
          <p className="flex gap-2 text-muted-foreground"><Check className="size-4 shrink-0 text-crimson" />{t("completeAll", lang)}</p>
        ) : (
          <>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("missingTitle", lang)}</p>
            <ul className="grid gap-2">
              {missing.map((m) => (
                <li key={m.key} className="flex items-start justify-between gap-3">
                  <span title={m.hint[lang]}>{m.label[lang]}</span>
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">+{m.points}</span>
                </li>
              ))}
            </ul>
            {!signedIn && <p className="text-xs text-muted-foreground">{t("signInToHelp", lang)}</p>}
            <Button asChild><Link href={href}><Sparkles />{t("helpComplete", lang)}</Link></Button>
            <Link href={`/contribute${lang === "en" ? "?lang=en" : ""}`} className="text-center text-xs text-muted-foreground underline">
              {lang === "el" ? "Πώς λειτουργούν οι πόντοι" : "How points work"}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
