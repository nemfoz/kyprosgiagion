import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Church, Landmark, Map as MapIcon, MapPinned } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { TypeBadge } from "@/components/type-badge"
import { editionChurch, editionTitle } from "@/lib/editions"
import { editionPage } from "@/lib/edition-page"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { localePath, tr, type Locale } from "@/lib/locales"
import type { Edition } from "@/lib/editions"
import type { TFn } from "@/lib/i18n"
import { metroText, publicMetropolises } from "@/lib/metropolises"
import { sized } from "@/lib/photo-sizes.mjs"
import { regionAncestors, regionName, regionTree } from "@/lib/regions"
import { editionRegions } from "@/lib/regions-server"
import { getSession } from "@/lib/session"
import { siteSummaries } from "@/lib/sites"
import { alternates, openGraph, pageTitle } from "@/lib/seo"

// The landing page's introduction: the edition's own text, else the general one (Cyprus: its older text key).
const introText = (e: Edition, t: TFn, lang: Locale) =>
  tr(e.intro, lang) || (e.id === "cyprus" ? t("edIntro", lang) : t("edIntroGeneric", lang, { church: editionChurch(e, lang) }))

export async function generateMetadata({ params, searchParams }: PageProps<"/[edition]">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const [t, { edition, paths }] = await Promise.all([getT(), editionPage((await params).edition, { forMetadata: true })])
  const title = editionTitle(edition, lang)
  return {
    title: pageTitle(title, lang), description: introText(edition, t, lang),
    alternates: alternates(paths.home, lang), openGraph: openGraph(paths.home, lang, title, introText(edition, t, lang)),
    ...(edition.active ? {} : { robots: { index: false } }),
  }
}

/** An edition's landing page: the Church, its regions and sees, a few churches, and the way into the map. */
export default async function EditionHome({ params, searchParams }: PageProps<"/[edition]">) {
  const lang = langFrom((await searchParams).lang)
  const { edition, paths, regions: active } = await editionPage((await params).edition)
  const [t, session, all, allMetros, regionList] = await Promise.all([getT(), getSession(), siteSummaries(), publicMetropolises(), editionRegions(edition.id, { all: true })])
  const sites = all.filter((s) => s.edition === edition.id)
  const metros = allMetros.filter((m) => m.edition === edition.id)
  const regions = regionTree(regionList)
  const withPhoto = sites.filter((s) => s.cover)
  const hero = withPhoto.find((s) => s.coordsVerified) ?? withPhoto[0]
  const featured = withPhoto.filter((s) => s.id !== hero?.id).slice(0, 6)
  const inRegion = (id: string) => sites.filter((s) => regionAncestors(regionList, s.region).includes(id)).length
  const sees = metros.toSorted((a, b) => b.churches - a.churches || a.sort - b.sort)
  const stats = [
    { n: sites.length, label: t("statChurches", lang), icon: <Church /> },
    { n: metros.length, label: t("statSees", lang), icon: <Landmark /> },
    { n: active.length, label: t("statRegions", lang), icon: <MapPinned /> },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path={paths.home} signedIn={!!session} edition={edition.id} />

      <section className={`relative flex items-end overflow-hidden ${hero ? "min-h-[min(62vh,560px)] bg-foreground" : "bg-crimson"}`}>
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.cover!} srcSet={`${sized(hero.cover!, "md")} 960w, ${hero.cover} 2400w`} sizes="100vw" alt="" className="absolute inset-0 size-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/10" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-10 text-parchment">
          <p className="mb-3 text-[11px] font-semibold tracking-[.14em] text-gold uppercase">{editionChurch(edition, lang)}</p>
          <h1 className="font-heading text-[clamp(32px,6vw,56px)] leading-tight font-bold">{editionTitle(edition, lang)}</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-parchment/90">{introText(edition, t, lang)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button asChild size="lg" className="h-12 px-6 text-base"><Link href={localePath(paths.map, lang)}><MapIcon />{t("edOpenMap", lang)}</Link></Button>
            <dl className="flex gap-6">
              {stats.map((s) => (
                <div key={s.label} className="grid">
                  <dd className="font-heading text-2xl font-bold">{s.n}</dd>
                  <dt className="text-xs text-parchment/75">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          {hero && <p className="mt-6 text-xs text-parchment/70">{tr(hero.name, lang)}</p>}
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
        {!edition.active && <p className="rounded-xl border border-dashed border-primary/40 bg-accent/50 p-4 text-sm">{t("edNotPublic", lang)}</p>}
        {sites.length === 0 && <p className="max-w-2xl text-muted-foreground">{t("edEmpty", lang)}</p>}
        {regions.length > 0 && <section className="grid gap-4">
          <h2 className="text-2xl font-bold">{t("edRegions", lang)}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((r) => {
              const n = inRegion(r.id)
              const parent = regions.find((p) => p.id === r.parent)
              const body = (
                <>
                  <span className="grid min-w-0">
                    <span className="font-heading text-lg leading-snug font-bold">{regionName(r, lang)}</span>
                    <span className="text-xs text-muted-foreground">{parent ? regionName(parent, lang) : editionChurch(edition, lang)}</span>
                  </span>
                  <span className="text-right text-xs text-muted-foreground">
                    {r.active ? <><b className="block font-heading text-xl text-foreground">{n}</b>{t("statChurches", lang)}</> : t("edRegionSoon", lang)}
                  </span>
                </>
              )
              return (
                <li key={r.id}>
                  {r.active ? (
                    <Link href={localePath(`${paths.map}?region=${r.id}`, lang)} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">{body}</Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-card/60 p-4 opacity-80">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>}

        {sees.length > 0 && <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-bold">{t("edSees", lang)}</h2>
            <Link href={localePath(paths.metropolises, lang)} className="inline-flex items-center gap-1 text-sm font-medium text-primary">{t("edAllSees", lang)}<ArrowRight className="size-4" /></Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sees.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <Link href={localePath(paths.metropolis(m.slug), lang)} className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary">
                  {m.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.logo} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg border bg-background object-contain p-1" />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-t-[22px] rounded-b-lg bg-accent text-xl text-primary">☦</span>
                  )}
                  <span className="grid min-w-0">
                    <span className="line-clamp-2 text-sm leading-snug font-semibold">{metroText(m, "name", lang)}</span>
                    <span className="text-xs text-muted-foreground">{t("metroChurchCount", lang, { n: m.churches })}</span>
                  </span>
                </Link>
                {m.churches > 0 && (
                  <Button asChild variant="ghost" size="icon" aria-label={t("edViewOnMap", lang)}>
                    <Link href={localePath(`${paths.map}?metropolis=${m.slug}`, lang)}><MapIcon /></Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>}

        {featured.length > 0 && (
          <section className="grid gap-4">
            <h2 className="text-2xl font-bold">{t("edFeatured", lang)}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((s) => (
                <li key={s.id}>
                  <Link href={localePath(paths.site(s.slug), lang)} className="group grid overflow-hidden rounded-xl border bg-card transition hover:border-primary/40 hover:shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sized(s.cover!, "md")} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
                    <span className="grid gap-1.5 p-4">
                      <TypeBadge type={s.type} lang={lang} />
                      <span className="font-heading text-lg leading-snug font-bold group-hover:text-primary">{tr(s.name, lang)}</span>
                      <span className="text-sm text-muted-foreground">{tr(s.location, lang)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="justify-self-center"><Link href={localePath(paths.map, lang)}><MapIcon />{t("edOpenMap", lang)}</Link></Button>
          </section>
        )}
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
