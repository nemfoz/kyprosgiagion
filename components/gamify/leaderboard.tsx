import { BADGES, type BadgeKey } from "@/lib/completeness"
import type { Lang } from "@/lib/content"
import { cn } from "@/lib/utils"

type Row = { userId: string; name: string; points: number; approved: number; level: { el: string; en: string }; badges: BadgeKey[] }

export function BadgeIcons({ badges, lang }: { badges: BadgeKey[]; lang: Lang }) {
  return (
    <span className="inline-flex gap-0.5">
      {badges.map((b) => <span key={b} title={BADGES[b][lang]} aria-label={BADGES[b][lang]}>{BADGES[b].icon}</span>)}
    </span>
  )
}

export function Leaderboard({ rows, lang, highlight }: { rows: Row[]; lang: Lang; highlight?: string }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{lang === "el" ? "Γίνετε ο πρώτος που θα μπει στον πίνακα!" : "Be the first on the board!"}</p>
  }
  return (
    <ol className="grid gap-1.5">
      {rows.map((r, i) => (
        <li key={r.userId} className={cn("grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5", r.userId === highlight && "bg-accent")}>
          <span className={cn("text-center font-heading font-bold", i < 3 ? "text-gold-deep" : "text-muted-foreground")}>{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{r.name} <BadgeIcons badges={r.badges} lang={lang} /></span>
            <span className="block text-xs text-muted-foreground">{r.level[lang]} · {r.approved} {lang === "el" ? "συνεισφορές" : "contributions"}</span>
          </span>
          <span className="font-semibold text-primary">{r.points}</span>
        </li>
      ))}
    </ol>
  )
}
