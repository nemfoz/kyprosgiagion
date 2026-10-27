import { BADGES, type BadgeKey, type Level } from "@/lib/completeness"
import { t, trData } from "@/lib/i18n"
import type { Locale } from "@/lib/locales"
import { cn } from "@/lib/utils"

type Row = { userId: string; name: string; points: number; approved: number; level: Level; badges: BadgeKey[] }

export function BadgeIcons({ badges, lang }: { badges: BadgeKey[]; lang: Locale }) {
  return (
    <span className="inline-flex gap-0.5">
      {badges.map((b) => <span key={b} title={trData(`data.badge.${b}`, BADGES[b], lang)} aria-label={trData(`data.badge.${b}`, BADGES[b], lang)}>{BADGES[b].icon}</span>)}
    </span>
  )
}

export function Leaderboard({ rows, lang, highlight }: { rows: Row[]; lang: Locale; highlight?: string }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{t("lbEmpty", lang)}</p>
  }
  return (
    <ol className="grid gap-1.5">
      {rows.map((r, i) => (
        <li key={r.userId} className={cn("grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5", r.userId === highlight && "bg-accent")}>
          <span className={cn("text-center font-heading font-bold", i < 3 ? "text-gold-deep" : "text-muted-foreground")}>{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{r.name} <BadgeIcons badges={r.badges} lang={lang} /></span>
            <span className="block text-xs text-muted-foreground">{trData(`data.level.${r.level.index}`, r.level, lang)} · {t("lbContributions", lang, { n: r.approved })}</span>
          </span>
          <span className="font-semibold text-primary">{r.points}</span>
        </li>
      ))}
    </ol>
  )
}
