import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, Footprints, Landmark, Map as MapIcon, ShieldCheck, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { WorldMap } from "@/components/home/world-map"
import { EditionsGrid, FeaturedChurches, StatsRow, WorldLegend, worldEditions, worldLabels } from "@/components/home/parts"
import { brandName, editionPaths } from "@/lib/editions"
import { homeData } from "@/lib/home"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { localePath } from "@/lib/locales"
import { sized } from "@/lib/photo-sizes.mjs"
import { getSession } from "@/lib/session"
import { alternates, openGraph } from "@/lib/seo"
import { cn } from "@/lib/utils"

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const t = await getT()
  const title = `${brandName(lang)} – ${t("tagline", lang)}`
  return {
    title: { absolute: title }, description: t("seoBrand", lang),
    alternates: alternates("/", lang), openGraph: openGraph("/", lang, title, t("seoBrand", lang)), twitter: { card: "summary_large_image" },
  }
}

/**
 * Οδοιπορικό's home page, about the whole Orthodox world: the globe with every Church marked, the fourteen Churches
 * (open or in preparation), why the record matters, three ways in, what was recorded lately. Cyprus appears only
 * as the first edition.
 */
export default async function Home({ searchParams }: PageProps<"/">) {
  const lang = langFrom((await searchParams).lang)
  const [t, session, data] = await Promise.all([getT(), getSession(), homeData()])
  const open = data.editions.filter((e) => e.edition.active)
  const first = open[0]
  const atlas = localePath(editionPaths(first?.edition.id ?? "cyprus").map, lang)
  const covers = data.featured.slice(0, 3)
  const mission = [
    { icon: <BookOpen />, text: t("hMission1", lang) },
    { icon: <Users />, text: t("hMission2", lang) },
    { icon: <ShieldCheck />, text: t("hMission3", lang) },
  ]
  const ways = [
    {
      icon: <MapIcon />, title: t("h3ExploreTitle", lang), text: t("h3ExploreText", lang, { n: data.totals.churches }),
      href: atlas, button: t("h3ExploreBtn", lang), cover: covers[0]?.cover, primary: true,
    },
    {
      icon: <Footprints />, title: t("h3VisitTitle", lang), text: t("h3VisitText", lang),
      href: localePath(session ? "/profile" : "/signup", lang), button: t(session ? "h3VisitBtn" : "h3VisitBtnGuest", lang), cover: covers[1]?.cover,
    },
    {
      icon: <Sparkles />, title: t("h3HelpTitle", lang), text: t("h3HelpText", lang),
      href: localePath("/contribute", lang), button: t("h3HelpBtn", lang), cover: covers[2]?.cover,
    },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path="/" signedIn={!!session} edition={false} />

      {/* The Orthodox world: the globe on the right with a marker per Church, a few lines on the left. */}
      <section className="relative isolate border-b bg-[#e4dccb]">
        <WorldMap
          editions={worldEditions(data, lang, t)} labels={worldLabels(t, lang)}
          className="h-[52vh] min-h-[340px] w-full md:h-[min(78vh,720px)] md:min-h-[500px]"
          center={[30, 41]} zoom={2.1} offsetLeft={0.4} narrow={{ center: [33, 40], zoom: 1.5 }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[56%] bg-linear-to-r from-[#e4dccb] via-[#e4dccb]/85 to-transparent md:block" />
        <div className="mx-auto max-w-6xl md:pointer-events-none md:absolute md:inset-0 md:flex md:items-center md:px-4">
          <div className="border-t bg-card p-5 md:pointer-events-auto md:max-w-md md:border-0 md:bg-transparent md:p-0">
            <p className="text-[11px] font-semibold tracking-[.14em] text-gold-deep uppercase">{t("hKicker", lang)}</p>
            <h1 className="mt-2 font-heading text-[clamp(30px,4.2vw,46px)] leading-[1.05] font-bold">{brandName(lang)}</h1>
            <p className="mt-1 font-heading text-lg text-primary">{t("hTitle", lang)}</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/75">{t("hLead", lang)}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button asChild size="lg" className="h-11"><a href="#churches"><Landmark />{t("hChurchesBtn", lang)}</a></Button>
              {first && (
                <Link href={localePath(editionPaths(first.edition.id).home, lang)} className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary">
                  {t("hFirstEdition", lang)}<ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
        <WorldLegend t={t} lang={lang} className="pointer-events-none absolute bottom-3 left-4 rounded-xl bg-card/85 px-3 py-2 text-muted-foreground backdrop-blur max-md:hidden" />
      </section>
      <WorldLegend t={t} lang={lang} className="mx-auto w-full max-w-6xl px-4 pt-3 text-muted-foreground md:hidden" />

      <main className="mx-auto grid w-full max-w-6xl gap-16 px-4 py-12">
        {/* The fourteen Churches, in the order of the diptychs. */}
        <EditionsGrid data={data} t={t} lang={lang} id="churches" />
      </main>

      {/* Why: the mission, with the numbers. */}
      <section className="border-y bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[.16em] text-gold uppercase">{t("hMissionKicker", lang)}</p>
            <h2 className="mt-3 font-heading text-[clamp(28px,4.5vw,46px)] leading-[1.05] font-bold">{t("hMissionTitle", lang)}</h2>
            <ul className="mt-6 grid gap-4">
              {mission.map((m, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-t-[18px] rounded-b-md bg-parchment/10 text-gold [&_svg]:size-4">{m.icon}</span>
                  <p className="leading-relaxed text-parchment/90">{m.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <StatsRow data={data} t={t} lang={lang} dark className="sm:grid-cols-2 lg:grid-cols-2" />
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-16 px-4 py-12">
        {/* Three ways in. */}
        <section className="grid gap-5">
          <h2 className="text-2xl font-bold">{t("h3Title", lang)}</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {ways.map((w) => (
              <li key={w.title}>
                <Link href={w.href} className={cn("group grid h-full overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", w.primary && "ring-2 ring-primary/40")}>
                  <span className="relative h-28 overflow-hidden bg-accent">
                    {w.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sized(w.cover, "md")} alt="" loading="lazy" className="size-full object-cover opacity-90 transition group-hover:scale-105" />
                    )}
                    <span className="absolute bottom-3 left-4 grid size-11 place-items-center rounded-t-[22px] rounded-b-lg bg-card text-primary shadow [&_svg]:size-5">{w.icon}</span>
                  </span>
                  <span className="grid content-start gap-2 p-5">
                    <span className="font-heading text-xl leading-snug font-bold">{w.title}</span>
                    <span className="text-sm leading-relaxed text-muted-foreground">{w.text}</span>
                    <span className={cn("mt-2 inline-flex items-center gap-1.5 font-semibold", w.primary ? "text-primary" : "text-foreground")}>{w.button}<ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <FeaturedChurches data={data} t={t} lang={lang} skip={3} />

        {/* An edition for your Church. */}
        <section className="grid gap-4 rounded-2xl border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <h2 className="font-heading text-2xl font-bold">{t("hStartTitle", lang)}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("hStartText", lang)}</p>
          </div>
          <Button asChild size="lg" className="h-11 justify-self-start md:justify-self-end"><Link href={localePath("/contact", lang)}>{t("pageContact", lang)}<ArrowRight /></Link></Button>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
