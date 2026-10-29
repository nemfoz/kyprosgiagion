import { notFound } from "next/navigation"
import { EditionForm } from "@/components/admin/geo/edition-form"
import { listEditions } from "@/lib/editions-server"
import { getAdminT } from "@/lib/i18n-server"
import { isSuperadmin } from "@/lib/permissions"
import { listRegions } from "@/lib/regions-server"
import { requireUser } from "@/lib/session"
import type { Edition } from "@/lib/editions"

const EMPTY: Edition = {
  id: "", sort: 100, name: { el: "", en: "" }, church: { el: "", en: "" }, title: { el: "", en: "" }, intro: { el: "", en: "" },
  active: false, bounds: [[34, 32], [36, 35]], camera: null, defaultRegion: null, countries: [],
}

export default async function EditionPage({ params }: PageProps<"/admin/editions/[id]">) {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const { id } = await params
  const [t, editions, regions] = await Promise.all([getAdminT(), listEditions(), listRegions()])
  const isNew = id === "new"
  const edition = isNew ? EMPTY : editions.find((e) => e.id === id)
  if (!edition) notFound()
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{isNew ? t("geo.newEdition") : edition.name[t.lang] || edition.name.el}</h1>
      <EditionForm isNew={isNew} initial={edition} regions={regions.filter((r) => r.edition === edition.id).map((r) => ({ id: r.id, name: r.name[t.lang] || r.name.el }))} />
    </div>
  )
}
