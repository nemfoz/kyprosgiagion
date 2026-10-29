import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Footprints, Map as MapIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { WorldMap } from "@/components/home/world-map"
import { EditionsGrid, FeaturedChurches, StatsRow, WorldLegend, worldEditions, worldLabels } from "@/components/home/parts"
import { brandName, editionPaths, sitePath } from "@/lib/editions"
import { homeData } from "@/lib/home"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { localePath, tr } from "@/lib/locales"
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
 * Οδοιπορικό's home page: the globe of the Orthodox world (open editions lead in), then why the record matters
 * (a church's photograph) with three ways in — explore, keep your visits, help — and the numbers, churches and Churches.
 */
export default async function Home({ searchParams }: PageProps<"/">) {
  const lang = langFrom((await searchParams).lang)
  const [t, session, data] = await Promise.all([getT(), getSession(), homeData()])
  const cyprus = data.editions.find((e) => e.edition.id === "cyprus")
  const map = localePath(editionPaths("cyprus").map, lang)
  const hero = data.featured[0]
  const covers = data.featured.slice(1, 4)
  const ways = [
    {
      icon: <MapIcon />, title: t("h3ExploreTitle", lang), text: t("h3ExploreText", lang, { n: cyprus?.churches ?? 0 }),
      href: map, button: t("h3ExploreBtn", lang), cover: covers[0]?.cover, primary: true,
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

      {/* The Orthodox world: the globe on the right, a few lines on the left. */}
      <section className="relative isolate border-b bg-[#e4dccb]">
        <WorldMap
          editions={worldEditions(data, lang, t)} labels={worldLabels(t, lang)}
          className="h-[52vh] min-h-[340px] w-full md:h-[min(76vh,700px)] md:min-h-[480px]"
          center={[28, 40]} zoom={2.2} offsetLeft={0.42} narrow={{ center: [33, 39], zoom: 1.5 }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[56%] bg-linear-to-r from-[#e4dccb] via-[#e4dccb]/85 to-transparent md:block" />
        <div className="mx-auto max-w-6xl md:pointer-events-none md:absolute md:inset-0 md:flex md:items-center md:px-4">
          <div className="border-t bg-card p-5 md:pointer-events-auto md:max-w-sm md:border-0 md:bg-transparent md:p-0">
            <p className="text-[11px] font-semibold tracking-[.14em] text-gold-deep uppercase">{t("hKicker", lang)}</p>
            <h1 className="mt-2 font-heading text-[clamp(30px,4.2vw,46px)] leading-[1.05] font-bold">{brandName(lang)}</h1>
            <p className="mt-1 font-heading text-lg text-primary">{t("hTitle", lang)}</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/75">{t("hLead", lang)}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button asChild size="lg" className="h-11"><Link href={map}><MapIcon />{t("hOpenMap", lang)}</Link></Button>
              <Link href={localePath("/about", lang)} className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary">{t("hAbout", lang)}<ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </div>
        <WorldLegend t={t} lang={lang} className="pointer-events-none absolute bottom-3 left-4 rounded-xl bg-card/85 px-3 py-2 text-muted-foreground backdrop-blur max-md:hidden" />
      </section>
      <WorldLegend t={t} lang={lang} className="mx-auto w-full max-w-6xl px-4 pt-3 text-muted-foreground md:hidden" />

      {/* Why: a church's photograph and the reason for the work. */}
      <section className={cn("relative isolate mt-8 flex items-end overflow-hidden md:mt-0", hero ? "min-h-[min(70vh,620px)] bg-foreground" : "bg-crimson")}>
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.cover!} srcSet={`${sized(hero.cover!, "md")} 960w, ${hero.cover} 2400w`} sizes="100vw" alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover opacity-75" />
        )}
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 via-black/50 to-black/15" />
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-36 text-parchment md:pb-40">
          <p className="text-[11px] font-semibold tracking-[.16em] text-gold uppercase">{t("h2Kicker", lang)}</p>
          <h2 className="mt-3 max-w-3xl font-heading text-[clamp(32px,5.5vw,60px)] leading-[1.03] font-bold">{t("h2Title", lang)}</h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-parchment/90">{t("h2Lead", lang)}</p>
          {hero && <Link href={localePath(sitePath(hero), lang)} className="mt-6 inline-block text-xs text-parchment/70 hover:text-parchment">{tr(hero.name, lang)} · {tr(hero.location, lang)}</Link>}
          <h2 className="mt-12 font-heading text-2xl font-bold">{t("h3Title", lang)}</h2>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-14 px-4 pb-12">
        {/* What would you like to do today? — three ways in, over the photograph's lower edge. */}
        <section className="-mt-28 md:-mt-32">
          <ul className="grid gap-4 md:grid-cols-3">
            {ways.map((w) => (
              <li key={w.title}>
                <Link href={w.href} className={cn("group grid h-full overflow-hidden rounded-2xl border bg-card shadow-md transition hover:-translate-y-0.5 hover:shadow-lg", w.primary && "ring-2 ring-primary/40")}>
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

        <StatsRow data={data} t={t} lang={lang} />
        <FeaturedChurches data={data} t={t} lang={lang} skip={4} />
        <EditionsGrid data={data} t={t} lang={lang} />
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-accent/60 p-4 text-sm">
          <span className="min-w-0 flex-1">{t("homeHelp", lang)}</span>
          <Button asChild variant="outline" size="sm"><Link href={localePath("/contact", lang)}>{t("pageContact", lang)}</Link></Button>
        </p>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
