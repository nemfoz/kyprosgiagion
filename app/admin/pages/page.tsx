import { notFound } from "next/navigation"
import { PagesForm } from "@/components/admin/pages-form"
import { isSuperadmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { getAdminT } from "@/lib/i18n-server"
import { getSiteInfo } from "@/lib/site-info"
import { DEFAULT_PAGES } from "@/lib/pages"

export default async function PagesPage() {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const [info, t] = await Promise.all([getSiteInfo(), getAdminT()])
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("admin.nav.pages")}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("admin.pages.intro")}</p>
      <PagesForm initial={info} defaults={DEFAULT_PAGES} />
    </div>
  )
}
