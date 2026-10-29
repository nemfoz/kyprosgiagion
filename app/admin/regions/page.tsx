import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ActiveSwitch } from "@/components/admin/geo/active-switch"
import { EditionPicker } from "@/components/admin/geo/edition-picker"
import { DEFAULT_EDITION } from "@/lib/editions"
import { listEditions } from "@/lib/editions-server"
import { getAdminT } from "@/lib/i18n-server"
import { isSuperadmin } from "@/lib/permissions"
import { regionTree } from "@/lib/regions"
import { listRegions } from "@/lib/regions-server"
import { requireUser } from "@/lib/session"
import { listSites } from "@/lib/sites"

/** An edition's regions: the map's region filter and outlines. */
export default async function RegionsPage({ searchParams }: PageProps<"/admin/regions">) {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const sp = await searchParams
  const [t, editions, regions, sites] = await Promise.all([getAdminT(), listEditions(), listRegions(), listSites({ publishedOnly: false })])
  const edition = editions.find((e) => e.id === sp.edition) ?? editions.find((e) => e.id === DEFAULT_EDITION) ?? editions[0]
  const list = regionTree(regions.filter((r) => r.edition === edition.id))
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("admin.nav.regions")}</h1>
        <EditionPicker value={edition.id} editions={editions.map((e) => ({ id: e.id, name: e.name[t.lang] || e.name.el }))} />
        <Button asChild className="ml-auto"><Link href={`/admin/regions/new?edition=${edition.id}`}><Plus />{t("geo.newRegion")}</Link></Button>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("geo.regionsIntro")}</p>
      {list.length === 0 ? <p className="text-muted-foreground">{t("geo.noRegions")}</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("geo.region")}</TableHead>
              <TableHead className="text-right">{t("geo.churches")}</TableHead>
              <TableHead>{t("geo.outline")}</TableHead>
              <TableHead>{t("geo.public")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id}>
                <TableCell className={r.parent ? "pl-8" : ""}><b>{r.name[t.lang] || r.name.el}</b><span className="block text-xs text-muted-foreground">{r.id}</span></TableCell>
                <TableCell className="text-right">{sites.filter((s) => s.region === r.id).length}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.hasBoundary ? "✓" : "—"}</TableCell>
                <TableCell><ActiveSwitch kind="region" id={r.id} active={r.active} label={t("geo.public")} /></TableCell>
                <TableCell className="text-right"><Button asChild variant="ghost" size="icon" aria-label={t("geo.edit")}><Link href={`/admin/regions/${r.id}`}><Pencil /></Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
