import { Explorer, type MapSite } from "@/components/map/explorer"
import { langFrom } from "@/lib/i18n"
import { defaultRegion, regions } from "@/lib/regions"
import { getSession } from "@/lib/session"
import { visitedIds } from "@/lib/visits"
import { getSiteInfo } from "@/lib/site-info"
import { siteSummaries } from "@/lib/sites"
import { publicMissionBoard } from "@/lib/contributors"
import { nameDaysAround } from "@/lib/namedays"
import { metroText, publicMetropolises } from "@/lib/metropolises"
import { LOCALES } from "@/lib/locales"
import type { Metadata } from "next"
import { brandName, paths } from "@/lib/editions"
import { getT } from "@/lib/i18n-server"
import { alternates, openGraph } from "@/lib/seo"
import { siteName } from "@/lib/regions"

export async function generateMetadata({ searchParams }: PageProps<"/cyprus/map">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const t = await getT()
  const title = `${t("map", lang)} · ${siteName(lang)} – ${brandName(lang)}`
  return {
    title: { absolute: title }, description: t("seoHome", lang),
    alternates: alternates(paths.map, lang), openGraph: openGraph(paths.map, lang, title, t("seoHome", lang)), twitter: { card: "summary_large_image" },
  }
}

export default async function MapPage({ searchParams }: PageProps<"/cyprus/map">) {
  const sp = await searchParams
  const [rows, session, metros] = await Promise.all([siteSummaries(), getSession(), publicMetropolises()])
  // Completeness is for contributors only; visitors browsing the map don't see it.
  const [board, visited, info] = await Promise.all([
    session ? publicMissionBoard() : null,
    session ? visitedIds(session.user.id) : [],
    getSiteInfo(),
  ])
  const seen = new Set(visited)
  const percent = new Map(board?.sites.map((s) => [s.id, s.percent]))
  const sites: MapSite[] = rows.map((s) => ({
    id: s.id, slug: s.slug, type: s.type, region: s.region, lat: s.lat, lng: s.lng,
    coordsVerified: s.coordsVerified, cover: s.cover, percent: percent.get(s.id) ?? null, visited: seen.has(s.id), metropolisId: s.metropolisId,
    name: s.name, location: s.location, summary: s.summary,
  }))
  const region = typeof sp.region === "string" && regions.some((r) => r.active && r.id === sp.region) ? sp.region : defaultRegion

  return (
    <Explorer
      sites={sites}
      initialLang={langFrom(sp.lang)}
      initialRegion={region}
      initialMetropolis={typeof sp.metropolis === "string" ? sp.metropolis : undefined}
      metropolises={metros.filter((m) => m.churches > 0).map((m) => ({ id: m.id, slug: m.slug, name: Object.fromEntries(LOCALES.map((l) => [l, metroText(m, "name", l)])) }))}
      initialSlug={typeof sp.site === "string" ? sp.site : undefined}
      account={session ? { name: session.user.name } : null}
      nameDays={{ el: nameDaysAround("el"), en: nameDaysAround("en") }}
      foundationUrl={info.foundationUrl}
    />
  )
}
