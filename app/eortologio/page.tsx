import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PublicHeader } from "@/components/public-header"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { addDays, findName, formatDay, isoDay, feastName, monthName, movableFeasts, nameDay, orthodoxEaster, today, weekday, type Day } from "@/lib/namedays"
import { getSession } from "@/lib/session"
import { isExtra, localePath } from "@/lib/locales"
import { cn } from "@/lib/utils"
import { alternates, openGraph, pageTitle } from "@/lib/seo"

export async function generateMetadata({ searchParams }: PageProps<"/eortologio">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const t = await getT()
  return { title: pageTitle(t("ndTitle", lang), lang), description: t("seoNameDays", lang), alternates: alternates("/eortologio", lang), openGraph: openGraph("/eortologio", lang, t("ndTitle", lang), t("seoNameDays", lang)) }
}

const same = (a: Day, b: Day) => a.y === b.y && a.m === b.m && a.d === b.d
const days = (a: Day, b: Day) => Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86_400_000)

export default async function NameDaysPage({ searchParams }: PageProps<"/eortologio">) {
  const sp = await searchParams
  const lang = langFrom(sp.lang)
  const [t, session] = await Promise.all([getT(), getSession()])
  const now = today()
  const y = Math.min(Math.max(Number(sp.y) || now.y, 1900), 2099)
  const m = Math.min(Math.max(Number(sp.m) || now.m, 1), 12)
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : ""

  const href = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams()
    for (const [k, v] of Object.entries({ y, m, q: q || undefined, ...params })) {
      if (v !== undefined && v !== "") u.set(k, String(v))
    }
    return localePath(`/eortologio?${u}`, lang)
  }
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }

  const todayInfo = nameDay(now)
  let easter = orthodoxEaster(now.y)
  if (days(easter, now) < 0) easter = orthodoxEaster(now.y + 1)

  const month: Day[] = []
  for (let d: Day = { y, m, d: 1 }; d.m === m; d = addDays(d, 1)) month.push(d)
  const results = q ? findName(q, y) : []

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader lang={lang} path={`/eortologio?${new URLSearchParams({ y: String(y), m: String(m), ...(q ? { q } : {}) })}`} signedIn={!!session} />

      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_300px] md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[.14em] text-gold uppercase">{t("ndTitle", lang)}</p>
            <h1 className="text-[clamp(26px,4vw,40px)] leading-tight font-bold">
              {weekday(now, lang)}, {formatDay(now, lang, true)}
            </h1>
            {todayInfo.feasts.length > 0 && <p className="mt-2 font-heading text-lg text-gold">{todayInfo.feasts.map((f) => feastName(f, lang)).join(" · ")}</p>}
            <p className="mt-2 text-lg text-parchment/90">{todayInfo.names.join(", ") || t("ndNobody", lang)}</p>
            <p className="mt-4 max-w-2xl text-sm text-parchment/75">{t("ndIntro", lang)}</p>
            {isExtra(lang) && <p className="mt-2 max-w-2xl text-sm text-parchment/75">{t("ndCalendarNote", lang)}</p>}
          </div>
          <div className="rounded-xl bg-parchment/10 p-4 backdrop-blur">
            <p className="text-sm text-parchment/80">{t("ndEaster", lang, { year: easter.y })}</p>
            <p className="font-heading text-3xl font-bold">{formatDay(easter, lang)}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-6">
          <form className="flex gap-2" action={localePath("/eortologio", lang)}>
            <input type="hidden" name="y" value={y} />
            <input type="hidden" name="m" value={m} />
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder={t("ndSearch", lang)} className="h-10 pl-9" />
            </div>
            <Button type="submit" className="h-10">{t("ndSearchButton", lang)}</Button>
          </form>
          {q && (
            <Card className="gap-3 py-4">
              <CardContent className="grid gap-2 px-4 text-sm">
                {results.length ? (
                  <>
                    <p className="text-muted-foreground">{t("ndSearchResults", lang, { q, year: y })}</p>
                    <ul className="grid gap-1.5">
                      {results.map((r) => (
                        <li key={isoDay(r.day)} className="flex flex-wrap gap-x-3">
                          <Link href={href({ m: r.day.m, q: undefined }) + `#d${r.day.d}`} className="font-semibold text-primary underline underline-offset-2">
                            {weekday(r.day, lang)}, {formatDay(r.day, lang)}
                          </Link>
                          <span className="text-muted-foreground">{r.feasts.map((f) => feastName(f, lang)).join(" · ")}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p className="text-muted-foreground">{t("ndSearchNone", lang, { q })}</p>}
              </CardContent>
            </Card>
          )}

          <section className="grid gap-3">
            <div className="flex items-center gap-2">
              <h2 className="mr-auto text-2xl font-bold">{monthName(m, lang)} {y}</h2>
              <Button variant="outline" size="icon-sm" asChild><Link href={href(prev)} aria-label={t("ndPrev", lang)}><ChevronLeft /></Link></Button>
              {(y !== now.y || m !== now.m) && <Button variant="outline" size="sm" asChild><Link href={href({ y: now.y, m: now.m })}>{t("ndThisMonth", lang)}</Link></Button>}
              <Button variant="outline" size="icon-sm" asChild><Link href={href(next)} aria-label={t("ndNext", lang)}><ChevronRight /></Link></Button>
            </div>
            <ol className="grid gap-1.5">
              {month.map((d) => {
                const info = nameDay(d)
                const isToday = same(d, now)
                return (
                  <li key={d.d} id={`d${d.d}`} className={cn("grid scroll-mt-4 grid-cols-[56px_1fr] gap-3 rounded-lg border bg-card px-3 py-2", isToday && "border-primary bg-accent")}>
                    <span className="grid text-center leading-tight">
                      <span className="font-heading text-xl font-bold text-primary">{d.d}</span>
                      <span className="text-[11px] text-muted-foreground">{weekday(d, lang).slice(0, 3)}</span>
                    </span>
                    <span className="grid content-center text-sm">
                      {info.feasts.length > 0 && <span className="font-semibold text-gold-deep">{info.feasts.map((f) => feastName(f, lang)).join(" · ")}</span>}
                      <span className={info.names.length ? "" : "text-muted-foreground"}>{info.names.join(", ") || "—"}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4"><CardTitle className="font-heading text-lg">{t("ndMovable", lang, { year: y })}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 px-4 text-sm">
              <ul className="grid gap-2">
                {movableFeasts(y).map((f) => (
                  <li key={f.feast.el} className="grid">
                    <span className="flex justify-between gap-3">
                      <span className="font-medium">{feastName(f.feast, lang)}</span>
                      <Link href={href({ m: f.day.m }) + `#d${f.day.d}`} className="shrink-0 text-primary underline underline-offset-2">{formatDay(f.day, lang)}</Link>
                    </span>
                    {f.names.length > 0 && <span className="text-xs text-muted-foreground">{f.names.join(", ")}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{t("ndMovableNote", lang)}</p>
            </CardContent>
          </Card>
          <p className="px-1 text-xs text-muted-foreground">{t("ndSource", lang)}</p>
        </aside>
      </main>
    </div>
  )
}
