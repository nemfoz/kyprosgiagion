import { notFound } from "next/navigation"
import { ImportCenter } from "@/components/admin/import/import-center"
import { DEFAULT_EDITION } from "@/lib/editions"
import { getAdminT } from "@/lib/i18n-server"
import { listMetropolises } from "@/lib/metropolises"
import { PARISH_SOURCES } from "@/lib/parish-sources"
import { isSuperadmin } from "@/lib/permissions"
import { regionOptions } from "@/lib/regions-server"
import { requireUser } from "@/lib/session"

/** Adding churches: quick add, spreadsheet import, Metropolis website importers (superadmins). */
export default async function ImportPage() {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const [t, regions, sees] = await Promise.all([getAdminT(), regionOptions((await getAdminT()).lang), listMetropolises()])
  const first = regions.find((r) => r.edition === DEFAULT_EDITION && r.active) ?? regions[0]
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("admin.nav.import")}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("import.intro")}</p>
      <ImportCenter
        regions={regions}
        initialRegion={first?.id ?? ""}
        sees={sees.map((m) => ({ slug: m.slug, name: m.content[t.lang].name || m.content.el.name, edition: m.edition }))}
        sources={PARISH_SOURCES.map((s) => ({ id: s.id, label: s.label[t.lang], url: s.url, note: s.note, see: s.see, region: s.region }))}
      />
    </div>
  )
}
