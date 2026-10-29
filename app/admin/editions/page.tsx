import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ActiveSwitch } from "@/components/admin/geo/active-switch"
import { listEditions } from "@/lib/editions-server"
import { getAdminT } from "@/lib/i18n-server"
import { listMetropolises } from "@/lib/metropolises"
import { isSuperadmin } from "@/lib/permissions"
import { listRegions } from "@/lib/regions-server"
import { requireUser } from "@/lib/session"
import { listSites } from "@/lib/sites"

/** The Churches (editions): which are public, and the way to their regions. */
export default async function EditionsPage() {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const [t, editions, regions, sites, sees] = await Promise.all([getAdminT(), listEditions(), listRegions(), listSites({ publishedOnly: false }), listMetropolises()])
  const editionOf = new Map(regions.map((r) => [r.id, r.edition]))
  const count = (id: string) => ({
    regions: regions.filter((r) => r.edition === id).length,
    sites: sites.filter((s) => editionOf.get(s.region) === id).length,
    sees: sees.filter((m) => m.edition === id).length,
  })
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("admin.nav.editions")}</h1>
        <Button asChild className="ml-auto"><Link href="/admin/editions/new"><Plus />{t("geo.newEdition")}</Link></Button>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("geo.editionsIntro")}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("geo.edition")}</TableHead>
            <TableHead className="max-md:hidden">{t("geo.church")}</TableHead>
            <TableHead className="text-right">{t("geo.regions")}</TableHead>
            <TableHead className="text-right">{t("geo.sees")}</TableHead>
            <TableHead className="text-right">{t("geo.churches")}</TableHead>
            <TableHead>{t("geo.public")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {editions.map((e) => {
            const n = count(e.id)
            return (
              <TableRow key={e.id}>
                <TableCell><b>{e.name[t.lang] || e.name.el}</b><span className="block text-xs text-muted-foreground">/{e.id}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground max-md:hidden">{e.church[t.lang] || e.church.el}</TableCell>
                <TableCell className="text-right"><Link href={`/admin/regions?edition=${e.id}`} className="text-primary underline-offset-2 hover:underline">{n.regions}</Link></TableCell>
                <TableCell className="text-right">{n.sees}</TableCell>
                <TableCell className="text-right">{n.sites}</TableCell>
                <TableCell><ActiveSwitch kind="edition" id={e.id} active={e.active} label={t("geo.public")} /></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button asChild variant="ghost" size="icon" aria-label={t("geo.open")}><Link href={`/${e.id}`} target="_blank"><ExternalLink /></Link></Button>
                  <Button asChild variant="ghost" size="icon" aria-label={t("geo.edit")}><Link href={`/admin/editions/${e.id}`}><Pencil /></Link></Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
