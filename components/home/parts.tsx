import Link from "next/link"
import { ArrowRight, Camera, Church, Landmark, MapPinned, Users } from "lucide-react"
import { TypeBadge } from "@/components/type-badge"
import type { WorldEdition } from "@/components/home/world-map"
import { editionChurch, editionName, editionPaths, sitePath } from "@/lib/editions"
import type { HomeData } from "@/lib/home"
import type { TFn } from "@/lib/i18n"
import { localePath, tr, type Locale } from "@/lib/locales"
import { sized } from "@/lib/photo-sizes.mjs"
import { cn } from "@/lib/utils"

// Parts of the home page (app/page.tsx).

export const worldEditions = (data: HomeData, lang: Locale, t: TFn): WorldEdition[] => data.editions.map(({ edition: e, churches, point }) => ({
  point, churchesLabel: t("hChurchesN", lang, { n: churches }), id: e.id, name: editionName(e, lang), church: editionChurch(e, lang), active: e.active, churches, href: localePath(editionPaths(e.id).home, lang),
}))

export const worldLabels = (t: TFn, lang: Locale) => ({ soon: t("homeSoon", lang) })

/** The globe's key: Orthodox countries, occupied areas, open and coming editions. */
export function WorldLegend({ t, lang, className }: { t: TFn; lang: Locale; className?: string }) {
  const item = "flex items-center gap-2"
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1.5 text-xs", className)}>
      <li className={item}><span className="size-3 rounded-sm border border-gold bg-[#fbf9f4]" />{t("hLegendOrthodox", lang)}</li>
      <li className={item}><span className="size-3 rounded-sm bg-crimson/75" />{t("hLegendOccupied", lang)}</li>
      <li className={item}><span className="size-3 rounded-full border-2 border-[#fbf9f4] bg-crimson" />{t("hLegendOpen", lang)}</li>
      <li className={item}><span className="size-2.5 rounded-full border-2 border-gold bg-[#fbf9f4]" />{t("hLegendSoon", lang)}</li>
    </ul>
  )
}

export function stats(data: HomeData, t: TFn, lang: Locale) {
  return [
    { n: data.totals.churches, label: t("statChurches", lang), icon: <Church /> },
    { n: data.totals.occupied, label: t("statOccupied", lang), icon: <MapPinned /> },
    { n: data.totals.photos, label: t("statPhotos", lang), icon: <Camera /> },
    { n: data.totals.sees, label: t("statSees", lang), icon: <Landmark /> },
    ...(data.totals.contributors ? [{ n: data.totals.contributors, label: t("statContributors", lang), icon: <Users /> }] : []),
  ]
}

export function StatsRow({ data, t, lang, className, dark }: { data: HomeData; t: TFn; lang: Locale; className?: string; dark?: boolean }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {stats(data, t, lang).map((s) => (
        <div key={s.label} className="grid">
          <dd className={cn("flex items-center gap-2 font-heading text-3xl font-bold [&_svg]:size-5", dark ? "[&_svg]:text-gold" : "[&_svg]:text-gold-deep")}>{s.icon}{s.n.toLocaleString(lang === "el" ? "el-GR" : "en-GB")}</dd>
          <dt className={cn("order-first text-xs tracking-wide uppercase", dark ? "text-parchment/70" : "text-muted-foreground")}>{s.label}</dt>
        </div>
      ))}
    </dl>
  )
}


export function FeaturedChurches({ data, t, lang, count = 6, skip = 0 }: { data: HomeData; t: TFn; lang: Locale; count?: number; skip?: number }) {
  if (data.featured.length <= skip) return null
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-2xl font-bold">{t("hFeatured", lang)}</h2>
        <Link href={localePath(editionPaths("cyprus").map, lang)} className="inline-flex items-center gap-1 text-sm font-medium text-primary">{t("edOpenMap", lang)}<ArrowRight className="size-4" /></Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.featured.slice(skip, skip + count).map((s) => (
          <li key={s.id}>
            <Link href={localePath(sitePath(s), lang)} className="group grid overflow-hidden rounded-xl border bg-card transition hover:border-primary/40 hover:shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(s.cover!, "md")} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover transition group-hover:scale-[1.02]" />
              <span className="grid gap-1.5 p-4">
                <TypeBadge type={s.type} lang={lang} />
                <span className="font-heading text-lg leading-snug font-bold group-hover:text-primary">{tr(s.name, lang)}</span>
                <span className="text-sm text-muted-foreground">{tr(s.location, lang)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Every Church: open editions as cards with their numbers, the others as "coming soon". */
export function EditionsGrid({ data, t, lang }: { data: HomeData; t: TFn; lang: Locale }) {
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-2xl font-bold">{t("hAllChurches", lang)}</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">{t("hAllChurchesText", lang)}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...data.editions].sort((a, b) => Number(b.edition.active) - Number(a.edition.active)).map(({ edition: e, churches }) => (
          <li key={e.id}>
            {e.active ? (
              <Link href={localePath(editionPaths(e.id).home, lang)} className="grid h-full content-start gap-1 rounded-xl border border-primary/30 bg-card p-4 transition hover:border-primary hover:shadow-sm">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-heading text-lg font-bold">{editionName(e, lang)}</span>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">{t("hChurchesN", lang, { n: churches })}</span>
                </span>
                <span className="text-xs text-muted-foreground">{editionChurch(e, lang)}</span>
              </Link>
            ) : (
              <div className="grid h-full content-start gap-1 rounded-xl border border-dashed bg-card/60 p-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-heading text-lg font-bold text-foreground/80">{editionName(e, lang)}</span>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">{t("homeSoon", lang)}</span>
                </span>
                <span className="text-xs text-muted-foreground">{editionChurch(e, lang)}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

