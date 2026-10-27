import { notFound } from "next/navigation"
import { eq, sql } from "drizzle-orm"
import { PointsForm } from "@/components/admin/points-form"
import { db, schema } from "@/lib/db"
import { DEFAULT_POINTS } from "@/lib/completeness"
import { isSuperadmin } from "@/lib/permissions"
import { getPointsConfig } from "@/lib/points"
import { requireUser } from "@/lib/session"
import { getAdminT } from "@/lib/i18n-server"

export default async function PointsPage() {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const [cfg, [{ approved }], t] = await Promise.all([
    getPointsConfig(),
    db.select({ approved: sql<number>`COUNT(*)` }).from(schema.submissions).where(eq(schema.submissions.status, "approved")),
    getAdminT(),
  ])
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("admin.nav.points")}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("admin.points.intro", { n: Number(approved) })}</p>
      <PointsForm initial={cfg} defaults={DEFAULT_POINTS} />
    </div>
  )
}
