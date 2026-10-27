import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { SiteForm } from "@/components/admin/site-form"
import { regionOptions, toFormPhotos, toFormValues, toFormVideos } from "@/lib/admin-form"
import { isAdmin } from "@/lib/permissions"
import { getPointsConfig } from "@/lib/points"
import { requireUser } from "@/lib/session"
import { getSite } from "@/lib/sites"

export default async function EditSitePage({ params }: PageProps<"/admin/sites/[id]">) {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const [site, points] = await Promise.all([getSite({ id: Number((await params).id) }), getPointsConfig()])
  if (!site || (!admin && !site.published)) notFound()
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{site.content.el.name || site.content.en.name}</h1>
        {!admin && <Badge variant="secondary">Πρόταση αλλαγών</Badge>}
        {admin && !site.published && <Badge variant="secondary">Πρόχειρο</Badge>}
      </div>
      {!admin && <p className="text-sm text-muted-foreground">Κάντε τις αλλαγές που προτείνετε. Θα σταλούν σε διαχειριστή για έγκριση.</p>}
      <SiteForm mode={admin ? "direct" : "propose"} siteId={site.id} initial={toFormValues(site)} photos={toFormPhotos(site)} videos={toFormVideos(site)} points={points} regions={regionOptions} />
    </div>
  )
}
