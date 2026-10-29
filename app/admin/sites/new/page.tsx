import { SiteForm } from "@/components/admin/site-form"
import { emptySite } from "@/lib/admin-form"
import { getAdminT } from "@/lib/i18n-server"
import { regionOptions } from "@/lib/regions-server"
import { isAdmin } from "@/lib/permissions"
import { getPointsConfig } from "@/lib/points"
import { listMetropolises } from "@/lib/metropolises"
import { requireUser } from "@/lib/session"

export default async function NewSitePage() {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const [points, t] = await Promise.all([getPointsConfig(), getAdminT()])
  const [regionList, metros] = await Promise.all([regionOptions(t.lang), listMetropolises()])
  const metroOptions = metros.map((m) => ({ id: m.id, name: m.content[t.lang].name || m.content.el.name, edition: m.edition }))
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t(admin ? "editor.newEntry" : "editor.proposeNew")}</h1>
      <SiteForm mode={admin ? "direct" : "propose"} siteId={null} initial={emptySite()} photos={[]} videos={[]} points={points} regions={regionList} metropolises={metroOptions} />
    </div>
  )
}
