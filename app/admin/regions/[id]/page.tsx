import { notFound } from "next/navigation"
import { RegionForm } from "@/components/admin/geo/region-form"
import { DEFAULT_EDITION } from "@/lib/editions"
import { listEditions } from "@/lib/editions-server"
import { getAdminT } from "@/lib/i18n-server"
import { isSuperadmin } from "@/lib/permissions"
import type { Region } from "@/lib/regions"
import { listRegions, regionBoundary } from "@/lib/regions-server"
import { requireUser } from "@/lib/session"

export default async function RegionPage({ params, searchParams }: PageProps<"/admin/regions/[id]">) {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const { id } = await params
  const sp = await searchParams
  const [t, editions, regions] = await Promise.all([getAdminT(), listEditions(), listRegions()])
  const isNew = id === "new"
  const edition = editions.find((e) => e.id === (isNew ? sp.edition : regions.find((r) => r.id === id)?.edition)) ?? editions.find((e) => e.id === DEFAULT_EDITION)!
  const region: Region | undefined = isNew
    ? { id: "", edition: edition.id, parent: null, sort: regions.filter((r) => r.edition === edition.id).length, name: { el: "", en: "" }, bounds: edition.bounds, camera: null, hasBoundary: false, active: false }
    : regions.find((r) => r.id === id)
  if (!region) notFound()
  const boundary = isNew ? null : await regionBoundary(region.id)
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{isNew ? t("geo.newRegion") : region.name[t.lang] || region.name.el}</h1>
      <RegionForm
        isNew={isNew} initial={region} boundary={boundary}
        editions={editions.map((e) => ({ id: e.id, name: e.name[t.lang] || e.name.el }))}
        parents={regions.filter((r) => r.id !== region.id).map((r) => ({ id: r.id, edition: r.edition, name: r.name[t.lang] || r.name.el }))}
      />
    </div>
  )
}
