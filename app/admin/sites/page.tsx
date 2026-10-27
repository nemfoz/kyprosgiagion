import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SitesTable } from "@/components/admin/sites-table"
import { isAdmin } from "@/lib/permissions"
import { regions } from "@/lib/regions"
import { requireUser } from "@/lib/session"
import { getAdminT } from "@/lib/i18n-server"
import { listSites } from "@/lib/sites"
import type { SiteType } from "@/lib/content"

export default async function SitesPage() {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const [sites, t] = await Promise.all([listSites({ publishedOnly: !admin }), getAdminT()])
  const regionName = Object.fromEntries(regions.map((r) => [r.id, r.name[t.lang]]))
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("editor.sites.title")}</h1>
        <span className="text-muted-foreground">{sites.length}</span>
        <Button asChild className="ml-auto"><Link href="/admin/sites/new"><Plus />{t(admin ? "editor.newEntry" : "editor.proposeNew")}</Link></Button>
      </div>
      {!admin && <p className="text-sm text-muted-foreground">{t("editor.sites.pickToPropose")}</p>}
      <SitesTable
        admin={admin}
        rows={sites.map((s) => ({
          id: s.id, slug: s.slug, type: s.type as SiteType, cover: s.cover, published: s.published, coordsVerified: s.coordsVerified,
          nameEl: s.content.el.name, nameEn: s.content.en.name, region: regionName[s.region] ?? s.region, updatedAt: s.updatedAt,
        }))}
      />
    </div>
  )
}
