import { Explorer, type MapSite } from "@/components/map/explorer"
import { langFrom, trData } from "@/lib/i18n"
import { getSession } from "@/lib/session"
import { visitedIds } from "@/lib/visits"
import { getSiteInfo } from "@/lib/site-info"
import { siteSummaries } from "@/lib/sites"
import { publicMissionBoard } from "@/lib/contributors"
import { nameDaysAround } from "@/lib/namedays"
import { metroText, publicMetropolises } from "@/lib/metropolises"
import { LOCALES } from "@/lib/locales"
import type { Metadata } from "next"
import { brandName, editionTitle, type Edition } from "@/lib/editions"
import { editionPage } from "@/lib/edition-page"
import { getT } from "@/lib/i18n-server"
import { alternates, openGraph } from "@/lib/seo"

export async function generateMetadata({ params, searchParams }: PageProps<"/[edition]/map">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const [t, { edition, paths }] = await Promise.all([getT(), editionPage((await params).edition, { forMetadata: true })])
  const title = `${t("map", lang)} · ${editionTitle(edition, lang)} – ${brandName(lang)}`
  return {
    title: { absolute: title }, description: t("seoHome", lang),
    alternates: alternates(paths.map, lang), openGraph: openGraph(paths.map, lang, title, t("seoHome", lang)), twitter: { card: "summary_large_image" },
    ...(edition.active ? {} : { robots: { index: false } }),
  }
}

// "All of Cyprus" keeps its own wording; other editions say "All regions".
const allLabel = (e: Edition, l: (typeof LOCALES)[number], t: Awaited<ReturnType<typeof getT>>) =>
  e.id === "cyprus" ? trData("data.region.all", { el: "Όλη η Κύπρος", en: "All of Cyprus" }, l) : t("mapAllRegions", l)

export default async function MapPage({ params, searchParams }: PageProps<"/[edition]/map">) {
  const sp = await searchParams
  const { edition, regions } = await editionPage((await params).edition)
  const [t, rows, session, metros] = await Promise.all([getT(), siteSummaries(), getSession(), publicMetropolises()])
  // Completeness is for contributors only; visitors browsing the map don't see it.
  const [board, visited, info] = await Promise.all([
    session ? publicMissionBoard() : null,
    session ? visitedIds(session.user.id) : [],
    getSiteInfo(),
  ])
  const seen = new Set(visited)
  const percent = new Map(board?.sites.map((s) => [s.id, s.percent]))
  const sites: MapSite[] = rows.filter((s) => s.edition === edition.id).map((s) => ({
    id: s.id, slug: s.slug, type: s.type, region: s.region, lat: s.lat, lng: s.lng,
    coordsVerified: s.coordsVerified, cover: s.cover, percent: percent.get(s.id) ?? null, visited: seen.has(s.id), metropolisId: s.metropolisId,
    name: s.name, location: s.location, summary: s.summary,
  }))
  const fallback = edition.defaultRegion && regions.some((r) => r.id === edition.defaultRegion) ? edition.defaultRegion : regions.length === 1 ? regions[0].id : "all"
  const region = typeof sp.region === "string" && (sp.region === "all" || regions.some((r) => r.id === sp.region)) ? sp.region : fallback

  return (
    <Explorer
      edition={{
        id: edition.id, bounds: edition.bounds, camera: edition.camera,
        title: Object.fromEntries(LOCALES.map((l) => [l, editionTitle(edition, l)])),
        allLabel: Object.fromEntries(LOCALES.map((l) => [l, allLabel(edition, l, t)])),
      }}
      regions={regions}
      defaultRegion={fallback}
      sites={sites}
      initialLang={langFrom(sp.lang)}
      initialRegion={region}
      initialMetropolis={typeof sp.metropolis === "string" ? sp.metropolis : undefined}
      metropolises={metros.filter((m) => m.edition === edition.id && m.churches > 0).map((m) => ({ id: m.id, slug: m.slug, name: Object.fromEntries(LOCALES.map((l) => [l, metroText(m, "name", l)])) }))}
      initialSlug={typeof sp.site === "string" ? sp.site : undefined}
      account={session ? { name: session.user.name } : null}
      nameDays={{ el: nameDaysAround("el"), en: nameDaysAround("en") }}
      foundationUrl={info.foundationUrl}
    />
  )
}
