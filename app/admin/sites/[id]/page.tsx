import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { SiteForm } from "@/components/admin/site-form"
import { toFormPhotos, toFormValues, toFormVideos } from "@/lib/admin-form"
import { getAdminT } from "@/lib/i18n-server"
import { regions } from "@/lib/regions"
import { isAdmin } from "@/lib/permissions"
import { getPointsConfig } from "@/lib/points"
import { listMetropolises } from "@/lib/metropolises"
import { requireUser } from "@/lib/session"
import { getSite } from "@/lib/sites"

export default async function EditSitePage({ params }: PageProps<"/admin/sites/[id]">) {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const [site, points, t] = await Promise.all([getSite({ id: Number((await params).id) }), getPointsConfig(), getAdminT()])
  if (!site || (!admin && !site.published)) notFound()
  const regionOptions = regions.map((r) => ({ id: r.id, name: r.name[t.lang], active: r.active }))
  const metroOptions = (await listMetropolises()).map((m) => ({ id: m.id, name: m.content[t.lang].name || m.content.el.name }))
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{site.content[t.lang].name || site.content.el.name || site.content.en.name}</h1>
        {!admin && <Badge variant="secondary">{t("editor.proposalBadge")}</Badge>}
        {admin && !site.published && <Badge variant="secondary">{t("editor.draft")}</Badge>}
      </div>
      {!admin && <p className="text-sm text-muted-foreground">{t("editor.proposeHelp")}</p>}
      <SiteForm mode={admin ? "direct" : "propose"} siteId={site.id} initial={toFormValues(site)} photos={toFormPhotos(site)} videos={toFormVideos(site)} points={points} regions={regionOptions} metropolises={metroOptions} />
    </div>
  )
}
