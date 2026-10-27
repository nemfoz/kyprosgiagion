import { notFound } from "next/navigation"
import { eq, sql } from "drizzle-orm"
import { PointsForm } from "@/components/admin/points-form"
import { db, schema } from "@/lib/db"
import { DEFAULT_POINTS } from "@/lib/completeness"
import { isSuperadmin } from "@/lib/permissions"
import { getPointsConfig } from "@/lib/points"
import { requireUser } from "@/lib/session"

export default async function PointsPage() {
  const me = await requireUser()
  if (!isSuperadmin(me.role)) notFound()
  const [cfg, [{ approved }]] = await Promise.all([
    getPointsConfig(),
    db.select({ approved: sql<number>`COUNT(*)` }).from(schema.submissions).where(eq(schema.submissions.status, "approved")),
  ])
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Πόντοι</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Πόσους πόντους αξίζει κάθε ενότητα, κάθε μπόνους και κάθε τίτλος. Με την αποθήκευση οι πόντοι όλων
        ({Number(approved)} εγκεκριμένες προτάσεις) υπολογίζονται ξανά με τις νέες τιμές — κατάταξη, τίτλοι και ποσοστά πληρότητας ενημερώνονται αμέσως.
      </p>
      <PointsForm initial={cfg} defaults={DEFAULT_POINTS} />
    </div>
  )
}
