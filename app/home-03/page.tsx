import Link from "next/link"
import { ArrowRight, Footprints, Map as MapIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorldMap } from "@/components/home/world-map"
import { EditionsGrid, FeaturedChurches, StatsRow, VersionSwitch, WorldLegend, worldEditions, worldLabels } from "@/components/home/parts"
import { HomeFrame, homeContext, versionMetadata, type SearchParams } from "@/components/home/home-page"
import { brandName, editionPaths } from "@/lib/editions"
import { localePath } from "@/lib/locales"
import { sized } from "@/lib/photo-sizes.mjs"
import { cn } from "@/lib/utils"

export const generateMetadata = versionMetadata

/** Home, version 3 — action first: three clear ways in (explore, keep your visits, help), then the rest. */
export default async function HomeActionFirst({ searchParams }: { searchParams: SearchParams }) {
  const { lang, t, session, data } = await homeContext(searchParams)
  const cyprus = data.editions.find((e) => e.edition.id === "cyprus")
  const covers = data.featured.slice(0, 3)
  const paths = [
    {
      icon: <MapIcon />, title: t("h3ExploreTitle", lang), text: t("h3ExploreText", lang, { n: cyprus?.churches ?? 0 }),
      href: localePath(editionPaths("cyprus").map, lang), button: t("h3ExploreBtn", lang), cover: covers[0]?.cover, primary: true,
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
    <HomeFrame lang={lang} path="/home-03" signedIn={!!session}>
      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-28 md:pt-14 md:pb-32">
          <p className="text-[11px] font-semibold tracking-[.14em] text-gold uppercase">{brandName(lang)} · {t("hKicker", lang)}</p>
          <h1 className="mt-3 max-w-3xl font-heading text-[clamp(32px,5.5vw,56px)] leading-[1.05] font-bold">{t("h3Title", lang)}</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-parchment/85">{t("h3Lead", lang)}</p>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-14 px-4 pb-12">
        <ul className="-mt-20 grid gap-4 md:-mt-24 md:grid-cols-3">
          {paths.map((p) => (
            <li key={p.title}>
              <Link href={p.href} className={cn("group grid h-full overflow-hidden rounded-2xl border bg-card shadow-md transition hover:-translate-y-0.5 hover:shadow-lg", p.primary && "ring-2 ring-primary/40")}>
                <span className="relative h-32 overflow-hidden bg-accent">
                  {p.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sized(p.cover, "md")} alt="" className="size-full object-cover opacity-90 transition group-hover:scale-105" />
                  )}
                  <span className="absolute bottom-3 left-4 grid size-11 place-items-center rounded-t-[22px] rounded-b-lg bg-card text-primary shadow [&_svg]:size-5">{p.icon}</span>
                </span>
                <span className="grid content-start gap-2 p-5">
                  <span className="font-heading text-xl leading-snug font-bold">{p.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{p.text}</span>
                  <span className={cn("mt-2 inline-flex items-center gap-1.5 font-semibold", p.primary ? "text-primary" : "text-foreground")}>{p.button}<ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <StatsRow data={data} t={t} lang={lang} />

        <section className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_1.4fr] md:items-center md:p-6">
          <div className="grid gap-2">
            <h2 className="text-2xl font-bold">{t("h2WorldTitle", lang)}</h2>
            <p className="text-muted-foreground">{t("h2WorldText", lang)}</p>
            <WorldLegend t={t} lang={lang} className="mt-2 text-muted-foreground" />
            <Button asChild variant="outline" className="mt-3 justify-self-start"><Link href={localePath(editionPaths("cyprus").home, lang)}>{t("homeEnter", lang)} · Κύπρος<ArrowRight /></Link></Button>
          </div>
          <WorldMap editions={worldEditions(data, lang, t)} labels={worldLabels(t, lang)} className="aspect-[16/10] w-full rounded-xl bg-[#e4dccb]" center={[32, 40]} zoom={1.5} narrow={{ center: [33, 38], zoom: 1.1 }} />
        </section>

        <FeaturedChurches data={data} t={t} lang={lang} count={3} />
        <EditionsGrid data={data} t={t} lang={lang} />
      </main>
      <VersionSwitch current={3} t={t} lang={lang} />
    </HomeFrame>
  )
}
