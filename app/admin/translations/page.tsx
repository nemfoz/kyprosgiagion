import { notFound } from "next/navigation"
import { TranslationsEditor } from "@/components/admin/translations-editor"
import { getAdminT, getOverrides } from "@/lib/i18n-server"
import { isSuperadmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"

export default async function TranslationsPage() {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const [t, overrides] = await Promise.all([getAdminT(), getOverrides()])
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("admin.nav.translations")}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("admin.translations.intro")}</p>
      <TranslationsEditor initial={overrides} />
    </div>
  )
}
