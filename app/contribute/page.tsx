import type { Metadata } from "next"
import Link from "next/link"
import { ImagePlus, MapPin, PenLine, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { MissionList } from "@/components/gamify/mission-list"
import { Leaderboard } from "@/components/gamify/leaderboard"
import { BADGES, BONUSES, levelsFor, PAGE_POINTS, SECTIONS, type BonusKey } from "@/lib/completeness"
import { getPointsConfig } from "@/lib/points"
import { publicLeaderboard, publicMissionBoard } from "@/lib/contributors"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { PublicHeader } from "@/components/public-header"
import { getSession } from "@/lib/session"
import { trData } from "@/lib/i18n"
import { alternates, openGraph, pageTitle } from "@/lib/seo"

export async function generateMetadata({ searchParams }: PageProps<"/contribute">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const t = await getT()
  return { title: pageTitle(t("contribute", lang), lang), description: t("seoContribute", lang), alternates: alternates("/contribute", lang), openGraph: openGraph("/contribute", lang, t("contribute", lang), t("seoContribute", lang)) }
}

export default async function ContributePage({ searchParams }: PageProps<"/contribute">) {
  const lang = langFrom((await searchParams).lang)
  const [board, top, session, cfg, t] = await Promise.all([publicMissionBoard(), publicLeaderboard(10), getSession(), getPointsConfig(), getT()])

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader lang={lang} path="/contribute" signedIn={!!session}>
        {!session && <Button size="sm" asChild><Link href="/signup">{t("signUp", lang)}</Link></Button>}
      </PublicHeader>

      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_340px] md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[.14em] text-gold">{t("cEyebrow", lang)}</p>
            <h1 className="text-[clamp(28px,4.5vw,42px)] leading-tight font-bold">{t("cHeading", lang)}</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-parchment/85">
              {t("cIntro", lang)}
            </p>
          </div>
          <div className="rounded-xl bg-parchment/10 p-4 backdrop-blur">
            <p className="flex items-baseline justify-between"><span className="text-sm text-parchment/80">{t("cMapCompleteness", lang)}</span><span className="font-heading text-3xl font-bold">{board.overall}%</span></p>
            <ProgressBar percent={board.overall} className="mt-2 bg-parchment/20" />
            <p className="mt-2 text-xs text-parchment/75">{t("cPagesComplete", lang, { n: board.complete, total: board.sites.length })}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-8">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: <PenLine />, title: t("cStep1", lang), text: t("cStep1Text", lang) },
              { icon: <ImagePlus />, title: t("cStep2", lang), text: t("cStep2Text", lang) },
              { icon: <Trophy />, title: t("cStep3", lang), text: t("cStep3Text", lang, { n: cfg.proposal }) },
            ].map((s, i) => (
              <Card key={i} className="gap-2 py-4">
                <CardContent className="grid gap-1.5 px-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary [&_svg]:size-5">{s.icon}</span>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="grid gap-3">
            <h2 className="text-2xl font-bold">{t("cNeedHelp", lang)}</h2>
            <p className="text-sm text-muted-foreground">{t("cNeedHelpText", lang)}</p>
            <MissionList sites={board.sites} lang={lang} signedIn={!!session} />
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-lg"><Trophy className="size-5 text-gold" />{t("cTop", lang)}</CardTitle></CardHeader>
            <CardContent><Leaderboard rows={top} lang={lang} highlight={session?.user.id} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">{t("cHowPoints", lang)}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p className="text-muted-foreground">
                {t("cHowPointsText", lang, { n: PAGE_POINTS })}
              </p>
              <table className="w-full">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="pb-1 text-left font-normal">{t("cSection", lang)}</th><th className="pb-1 text-right font-normal">{t("cPerLanguage", lang)}</th></tr>
                </thead>
                <tbody>
                  {SECTIONS.map((s) => (
                    <tr key={s.key} title={trData(`data.section.${s.key}.hint`, s.hint, lang)}>
                      <td className="py-0.5">{trData(`data.section.${s.key}`, s.label, lang)}{s.shared && <span className="text-xs text-muted-foreground"> · {t("cBoth", lang)}</span>}</td>
                      <td className="py-0.5 text-right font-semibold text-primary">{cfg.sections[s.key]}</td>
                    </tr>
                  ))}
                  <tr className="border-t"><td className="pt-1">{t("cTotal", lang)}</td><td className="pt-1 text-right font-semibold">{PAGE_POINTS}</td></tr>
                </tbody>
              </table>
              <div className="grid gap-1.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("cBonus", lang)}</p>
                {Object.entries(BONUSES).map(([k, b]) => (
                  <p key={k} className="flex justify-between gap-3" title={trData(`data.bonus.${k}.hint`, b.hint, lang)}><span>{trData(`data.bonus.${k}`, b.label, lang)}</span><b className="text-primary">+{cfg.bonuses[k as BonusKey]}</b></p>
                ))}
                <p className="flex justify-between gap-3"><span>{t("cEveryProposal", lang)}</span><b className="text-primary">+{cfg.proposal}</b></p>
                <p className="text-xs text-muted-foreground">{t("cBonusNote", lang)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">{t("cTitles", lang)}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <ul className="grid gap-1">
                {levelsFor(cfg).map((l, i) => <li key={l.min} className="flex justify-between"><span>{trData(`data.level.${i}`, l, lang)}</span><span className="text-muted-foreground">{l.min}+</span></li>)}
              </ul>
              <ul className="grid gap-1.5">
                {Object.entries(BADGES).map(([k, b]) => <li key={k}><span className="mr-2">{b.icon}</span>{trData(`data.badge.${k}`, b, lang)} <span className="text-xs text-muted-foreground">— {trData(`data.badge.${k}.hint`, b.hint, lang)}</span></li>)}
              </ul>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" />{t("cBoardPrivacy", lang)}</p>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
