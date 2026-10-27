import { notFound } from "next/navigation"
import { desc } from "drizzle-orm"
import { UsersManager } from "@/components/admin/users-manager"
import { db, schema } from "@/lib/db"
import { isAdmin, isSuperadmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { getAdminT } from "@/lib/i18n-server"

export default async function UsersPage() {
  const me = await requireUser()
  if (!isAdmin(me.role)) notFound()
  const [users, t] = await Promise.all([db.select().from(schema.user).orderBy(desc(schema.user.createdAt)), getAdminT()])
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("admin.nav.users")}</h1>
      <UsersManager
        meId={me.id}
        superadmin={isSuperadmin(me.role)}
        users={users.map((u) => ({
          id: u.id, name: u.name, email: u.email, role: u.role, approved: u.approved, emailVerified: u.emailVerified,
          banned: !!u.banned, createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
