import { SiteForm } from "@/components/admin/site-form"
import { emptySite, regionOptions } from "@/lib/admin-form"
import { isAdmin } from "@/lib/permissions"
import { getPointsConfig } from "@/lib/points"
import { requireUser } from "@/lib/session"

export default async function NewSitePage() {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const points = await getPointsConfig()
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{admin ? "Νέα καταχώρηση" : "Πρόταση νέας εκκλησίας"}</h1>
      <SiteForm mode={admin ? "direct" : "propose"} siteId={null} initial={emptySite()} photos={[]} videos={[]} points={points} regions={regionOptions} />
    </div>
  )
}
