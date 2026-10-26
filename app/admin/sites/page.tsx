import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SitesTable } from "@/components/admin/sites-table"
import { isAdmin } from "@/lib/permissions"
import { regions } from "@/lib/regions"
import { requireUser } from "@/lib/session"
import { listSites } from "@/lib/sites"
import type { SiteType } from "@/lib/content"

export default async function SitesPage() {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const sites = await listSites({ publishedOnly: !admin })
  const regionName = Object.fromEntries(regions.map((r) => [r.id, r.name.el]))
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Εκκλησίες & μοναστήρια</h1>
        <span className="text-muted-foreground">{sites.length}</span>
        <Button asChild className="ml-auto"><Link href="/admin/sites/new"><Plus />{admin ? "Νέα καταχώρηση" : "Πρόταση νέας εκκλησίας"}</Link></Button>
      </div>
      {!admin && <p className="text-sm text-muted-foreground">Επιλέξτε μια εκκλησία για να προτείνετε διορθώσεις ή φωτογραφίες.</p>}
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
