import Link from "next/link"
import { CircleCheck, Footprints, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { BADGES, type BadgeKey, type Level } from "@/lib/completeness"
import { editionName, editionPaths, sitePath } from "@/lib/editions"
import { trData } from "@/lib/i18n"
import type { TFn } from "@/lib/i18n"
import { intlLocale, localePath, tr, type Locale } from "@/lib/locales"
import { metroText } from "@/lib/metropolises"
import { sized } from "@/lib/photo-sizes.mjs"
import { regionName } from "@/lib/regions"
import { MILESTONES, type odoiporiko } from "@/lib/visits"

type Data = Awaited<ReturnType<typeof odoiporiko>>
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

/**
 * A user's odoiporiko: X of Y churches visited, by country, region and see, milestones and contribution badges.
 * `own` adds the list of visits with dates (the public profile never shows dates).
 */
export function OdoiporikoView({ data, lang, t, own, level, badges }: {
  data: Data; lang: Locale; t: TFn; own: boolean; level: Level | null; badges: BadgeKey[]
}) {
  const dateFmt = new Intl.DateTimeFormat(intlLocale(lang), { day: "numeric", month: "short", year: "numeric" })

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[auto_1fr] md:items-center md:p-6">
        <span className="grid size-20 place-items-center rounded-t-[40px] rounded-b-xl bg-accent text-primary"><Footprints className="size-9" /></span>
        <div className="grid gap-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-heading text-4xl font-bold">{t("pfVisited", lang, { n: data.visited, total: data.total })}</span>
            <span className="text-muted-foreground">{t("pfVisitedLabel", lang)}</span>
          </p>
          <ProgressBar percent={pct(data.visited, data.total)} />
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CircleCheck className="size-4 text-primary" />{t("pfVerified", lang, { n: data.verified })}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Breakdown title={t("pfByCountry", lang)} rows={data.countries.map((c) => ({ key: c.edition.id, label: editionName(c.edition, lang), visited: c.visited, total: c.total, href: localePath(editionPaths(c.edition.id).home, lang) }))} />
        <Breakdown title={t("pfByRegion", lang)} rows={data.regions.map((r) => ({ key: r.id, label: regionName(r.region, lang), visited: r.visited, total: r.total, href: localePath(`${editionPaths(r.region.edition).map}?region=${r.id}`, lang) }))} />
        {data.sees.length > 0 && (
          <Breakdown title={t("pfBySee", lang)} rows={data.sees.map((s) => ({ key: s.id, label: metroText(s.see, "name", lang), visited: s.visited, total: s.total, href: localePath(editionPaths(s.see.edition).metropolis(s.see.slug), lang) }))} />
        )}
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4"><CardTitle className="font-heading text-base">{t("pfMilestones", lang)}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 px-4">
          {MILESTONES.map(([n, key]) => (
            <span key={n} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${data.visited >= n ? "border-gold/60 bg-accent font-semibold" : "border-dashed text-muted-foreground"}`}>
              {t(key, lang)} <span className="text-xs font-normal text-muted-foreground">{t("pfMilestoneN", lang, { n })}</span>
            </span>
          ))}
          {(level || badges.length > 0) && (
            <span className="flex basis-full flex-wrap items-center gap-2 border-t pt-3 text-sm">
              <span className="text-muted-foreground">{t("pfContributions", lang)}:</span>
              {level && <b>{trData(`data.level.${level.index}`, level, lang)}</b>}
              {badges.map((b) => <span key={b} className="rounded-full bg-accent px-2.5 py-1 text-xs">{BADGES[b].icon} {trData(`data.badge.${b}`, BADGES[b], lang)}</span>)}
            </span>
          )}
        </CardContent>
      </Card>

      {own && (
        <section className="grid gap-3">
          <h2 className="text-2xl font-bold">{t("pfList", lang)}</h2>
          {data.list.length === 0 && <p className="max-w-xl text-muted-foreground">{t("pfEmpty", lang)}</p>}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.list.map((v) => (
              <li key={v.siteId}>
                <Link href={localePath(sitePath(v.site), lang)} className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm">
                  {v.site.cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={sized(v.site.cover, "sm")} alt="" loading="lazy" className="h-14 w-14 rounded-t-[28px] rounded-b-md object-cover" />
                    : <span className="grid h-14 w-14 place-items-center rounded-t-[28px] rounded-b-md bg-muted text-gold-deep">✝</span>}
                  <span className="grid min-w-0 gap-0.5">
                    <span className="line-clamp-2 text-sm leading-snug font-semibold">{tr(v.site.name, lang)}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {v.verified ? <CircleCheck className="size-3.5 text-primary" /> : <History className="size-3.5" />}
                      {dateFmt.format(new Date(`${v.visitedAt.replace(" ", "T")}Z`))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: { key: string; label: string; visited: number; total: number; href?: string }[] }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4"><CardTitle className="font-heading text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 px-4">
        {rows.map((r) => (
          <div key={r.key} className="grid gap-1 text-sm">
            <span className="flex items-baseline justify-between gap-3">
              {r.href ? <Link href={r.href} className="min-w-0 truncate hover:text-primary">{r.label}</Link> : <span className="min-w-0 truncate">{r.label}</span>}
              <span className="shrink-0 text-xs text-muted-foreground"><b className="text-foreground">{r.visited}</b> / {r.total}</span>
            </span>
            <ProgressBar percent={pct(r.visited, r.total)} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
