import Link from "next/link"
import { ArrowRight, Trophy } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { BADGES, MISSIONS, type BadgeKey, type MissionKey } from "@/lib/completeness"

type Stats = { points: number; approved: number; rank: number | null; level: { el: string; min: number }; next: { el: string; min: number } | null; badges: BadgeKey[] }
type Suggestion = { id: number; name: { el: string }; percent: number; missing: MissionKey[]; missingPoints: number }

/** Dashboard card: the user's points, level, badges and a few suggested missions. */
export function MyProgress({ stats, suggestions, overall }: { stats: Stats; suggestions: Suggestion[]; overall: number }) {
  const span = stats.next ? stats.next.min - stats.level.min : 1
  const toNext = stats.next ? Math.round(((stats.points - stats.level.min) / span) * 100) : 100
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="border-gold/40">
        <CardHeader>
          <CardDescription>Ο τίτλος σας</CardDescription>
          <CardTitle className="flex items-center gap-2 font-heading text-2xl"><Trophy className="size-6 text-gold" />{stats.level.el}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-baseline justify-between">
            <span><b className="font-heading text-3xl text-primary">{stats.points}</b> πόντοι</span>
            <span className="text-muted-foreground">{stats.rank ? `#${stats.rank} στην κατάταξη` : "εκτός κατάταξης ακόμα"}</span>
          </div>
          <ProgressBar percent={toNext} />
          <p className="text-xs text-muted-foreground">
            {stats.next ? `${stats.next.min - stats.points} πόντοι για τον τίτλο «${stats.next.el}»` : "Έχετε τον ανώτερο τίτλο!"} · {stats.approved} εγκεκριμένες συνεισφορές
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(BADGES) as BadgeKey[]).map((b) => {
              const has = stats.badges.includes(b)
              return (
                <span key={b} title={has ? BADGES[b].el : `${BADGES[b].el} (δεν έχει κερδηθεί ακόμα)`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${has ? "border-gold/50 bg-accent" : "opacity-40 grayscale"}`}>
                  {BADGES[b].icon} {BADGES[b].el}
                </span>
              )
            })}
          </div>
          <Link href="/contribute" className="text-xs text-primary underline">Πίνακας κατάταξης & κανόνες</Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Προτεινόμενες αποστολές</CardTitle>
          <CardDescription>Ο χάρτης είναι {overall}% πλήρης. Αυτές οι σελίδες χρειάζονται περισσότερη βοήθεια:</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {suggestions.map((s) => (
            <Link key={s.id} href={`/admin/sites/${s.id}`} className="group grid grid-cols-[1fr_auto_16px] items-center gap-3 rounded-lg border bg-background p-3 hover:border-primary/40">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.name.el}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.missing.slice(0, 3).map((k) => MISSIONS.find((m) => m.key === k)!.label.el).join(" · ")}</span>
              </span>
              <span className="text-right text-xs"><b className="text-primary">+{s.missingPoints}</b><span className="block text-muted-foreground">{s.percent}%</span></span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          ))}
          <Link href="/contribute" className="mt-1 text-sm text-primary underline">Όλες οι αποστολές</Link>
        </CardContent>
      </Card>
    </div>
  )
}
