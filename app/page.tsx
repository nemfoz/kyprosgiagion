import { Explorer, type MapSite } from "@/components/map/explorer"
import { langFrom } from "@/lib/i18n"
import { defaultRegion, regions } from "@/lib/regions"
import { getSession } from "@/lib/session"
import { listSites } from "@/lib/sites"
import type { SiteType } from "@/lib/content"
import { missionBoard } from "@/lib/contributors"

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams
  const [rows, session] = await Promise.all([listSites({ publishedOnly: true }), getSession()])
  // Completeness is for contributors only; visitors browsing the map don't see it.
  const board = session ? await missionBoard() : null
  const percent = new Map(board?.sites.map((s) => [s.id, s.percent]))
  const sites: MapSite[] = rows.map((s) => ({
    id: s.id, slug: s.slug, type: s.type as SiteType, region: s.region, lat: s.lat, lng: s.lng,
    coordsVerified: s.coordsVerified, cover: s.cover, percent: percent.get(s.id) ?? null,
    name: { el: s.content.el.name, en: s.content.en.name },
    location: { el: s.content.el.location, en: s.content.en.location },
    summary: { el: s.content.el.summary, en: s.content.en.summary },
  }))
  const region = typeof sp.region === "string" && regions.some((r) => r.active && r.id === sp.region) ? sp.region : defaultRegion

  return (
    <Explorer
      sites={sites}
      initialLang={langFrom(sp.lang)}
      initialRegion={region}
      initialSlug={typeof sp.site === "string" ? sp.site : undefined}
      account={session ? { name: session.user.name } : null}
    />
  )
}
