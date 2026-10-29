import Link from "next/link"
import { ArrowRight, BookOpen, Map as MapIcon, ShieldCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorldMap } from "@/components/home/world-map"
import { EditionsGrid, FeaturedChurches, StatsRow, VersionSwitch, WorldLegend, worldEditions, worldLabels } from "@/components/home/parts"
import { HomeFrame, homeContext, versionMetadata, type SearchParams } from "@/components/home/home-page"
import { brandName, editionPaths, sitePath } from "@/lib/editions"
import { localePath, tr } from "@/lib/locales"
import { sized } from "@/lib/photo-sizes.mjs"

export const generateMetadata = versionMetadata

/** Home, version 2 — story first: a church's photograph and the reason for the work, then the numbers and the world. */
export default async function HomeStoryFirst({ searchParams }: { searchParams: SearchParams }) {
  const { lang, t, session, data } = await homeContext(searchParams)
  const hero = data.featured[0]
  const mission = [
    { icon: <BookOpen />, text: t("h2Mission1", lang) },
    { icon: <Users />, text: t("h2Mission2", lang) },
    { icon: <ShieldCheck />, text: t("h2Mission3", lang) },
  ]
  return (
    <HomeFrame lang={lang} path="/home-02" signedIn={!!session}>
      <section className={`relative isolate flex items-end overflow-hidden ${hero ? "min-h-[min(84vh,760px)] bg-foreground" : "bg-crimson"}`}>
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.cover!} srcSet={`${sized(hero.cover!, "md")} 960w, ${hero.cover} 2400w`} sizes="100vw" alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-75" />
        )}
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 via-black/45 to-black/10" />
        <div className="mx-auto w-full max-w-6xl px-4 py-12 text-parchment md:py-16">
          <p className="text-[11px] font-semibold tracking-[.16em] text-gold uppercase">{brandName(lang)} · {t("h2Kicker", lang)}</p>
          <h1 className="mt-3 max-w-3xl font-heading text-[clamp(34px,6.5vw,68px)] leading-[1.02] font-bold">{t("h2Title", lang)}</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-parchment/90">{t("h2Lead", lang)}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base"><Link href={localePath(editionPaths("cyprus").map, lang)}><MapIcon />{t("hOpenMap", lang)}</Link></Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-parchment/40 bg-transparent px-6 text-base text-parchment hover:bg-parchment/10 hover:text-parchment"><Link href={localePath("/contribute", lang)}>{t("h3HelpBtn", lang)}<ArrowRight /></Link></Button>
          </div>
          {hero && <Link href={localePath(sitePath(hero), lang)} className="mt-8 inline-block text-xs text-parchment/70 hover:text-parchment">{tr(hero.name, lang)} · {tr(hero.location, lang)}</Link>}
        </div>
      </section>

      <section className="border-b bg-crimson text-parchment">
        <div className="mx-auto max-w-6xl px-4 py-8"><StatsRow data={data} t={t} lang={lang} dark /></div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-14 px-4 py-12">
        <section className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div className="grid gap-3">
            <h2 className="text-3xl font-bold">{t("h2MissionTitle", lang)}</h2>
            <ul className="grid gap-4">
              {mission.map((m, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-t-[18px] rounded-b-md bg-accent text-primary [&_svg]:size-4">{m.icon}</span>
                  <p className="leading-relaxed">{m.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2">
            <WorldMap editions={worldEditions(data, lang, t)} labels={worldLabels(t, lang)} className="aspect-[4/3] w-full rounded-2xl border bg-[#e4dccb]" center={[30, 39]} zoom={1.6} narrow={{ center: [33, 38], zoom: 1.1 }} />
            <WorldLegend t={t} lang={lang} className="text-muted-foreground" />
          </div>
        </section>
        <section className="grid gap-2">
          <h2 className="text-2xl font-bold">{t("h2WorldTitle", lang)}</h2>
          <p className="max-w-2xl text-muted-foreground">{t("h2WorldText", lang)}</p>
        </section>
        <FeaturedChurches data={data} t={t} lang={lang} />
        <EditionsGrid data={data} t={t} lang={lang} />
      </main>
      <VersionSwitch current={2} t={t} lang={lang} />
    </HomeFrame>
  )
}
