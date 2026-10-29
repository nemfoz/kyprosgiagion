import Link from "next/link"
import { ArrowRight, Map as MapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorldMap } from "@/components/home/world-map"
import { EditionsGrid, FeaturedChurches, HowItWorks, StatsRow, VersionSwitch, WorldLegend, worldEditions, worldLabels } from "@/components/home/parts"
import { HomeFrame, homeContext, versionMetadata, type SearchParams } from "@/components/home/home-page"
import { brandName, editionPaths } from "@/lib/editions"
import { localePath } from "@/lib/locales"

export const generateMetadata = versionMetadata

/** Home, version 1 — map first: the globe of the Orthodox world fills the top, with one line and the way in. */
export default async function HomeMapFirst({ searchParams }: { searchParams: SearchParams }) {
  const { lang, t, session, data } = await homeContext(searchParams)
  return (
    <HomeFrame lang={lang} path="/home-01" signedIn={!!session}>
      <section className="relative isolate border-b bg-[#e4dccb]">
        <WorldMap editions={worldEditions(data, lang, t)} labels={worldLabels(t, lang)} className="h-[52vh] min-h-[340px] w-full md:h-[min(78vh,720px)] md:min-h-[460px]" center={[8, 40]} zoom={2.3} narrow={{ center: [33, 39], zoom: 1.5 }} />
        <div className="pointer-events-none mx-auto max-w-6xl md:absolute md:inset-x-0 md:top-0 md:px-4 md:pt-10">
          <div className="pointer-events-auto border-t bg-card p-5 md:max-w-md md:rounded-2xl md:border md:bg-card/92 md:p-6 md:shadow-lg md:backdrop-blur">
            <p className="text-[11px] font-semibold tracking-[.14em] text-gold-deep uppercase">{t("hKicker", lang)}</p>
            <h1 className="mt-2 font-heading text-[clamp(28px,4.5vw,42px)] leading-[1.05] font-bold">{brandName(lang)}</h1>
            <p className="mt-1 font-heading text-lg text-primary">{t("hTitle", lang)}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("hLead", lang)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="lg" className="h-11"><Link href={localePath(editionPaths("cyprus").map, lang)}><MapIcon />{t("hOpenMap", lang)}</Link></Button>
              <Button asChild size="lg" variant="ghost" className="h-11"><Link href={localePath("/about", lang)}>{t("hAbout", lang)}<ArrowRight /></Link></Button>
            </div>
          </div>
        </div>
        <WorldLegend t={t} lang={lang} className="pointer-events-none absolute bottom-3 left-1/2 w-[min(100%-2rem,72rem)] -translate-x-1/2 rounded-xl bg-card/85 px-3 py-2 backdrop-blur max-md:hidden" />
      </section>
      <WorldLegend t={t} lang={lang} className="mx-auto w-full max-w-6xl px-4 pt-3 text-muted-foreground md:hidden" />

      <main className="mx-auto grid w-full max-w-6xl gap-14 px-4 py-10">
        <StatsRow data={data} t={t} lang={lang} />
        <HowItWorks t={t} lang={lang} />
        <FeaturedChurches data={data} t={t} lang={lang} />
        <EditionsGrid data={data} t={t} lang={lang} />
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-accent/60 p-4 text-sm">
          <span className="min-w-0 flex-1">{t("homeHelp", lang)}</span>
          <Button asChild variant="outline" size="sm"><Link href={localePath("/contact", lang)}>{t("pageContact", lang)}</Link></Button>
        </p>
      </main>
      <VersionSwitch current={1} t={t} lang={lang} />
    </HomeFrame>
  )
}
