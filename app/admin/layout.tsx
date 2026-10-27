import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { UserMenu } from "@/components/admin/user-menu"
import { AdminLangProvider } from "@/components/i18n-provider"
import { NameDayBar } from "@/components/namedays/nameday-bar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getAdminT } from "@/lib/i18n-server"
import { nameDaysAround } from "@/lib/namedays"
import { isAdmin, isRole, ROLE_LABELS } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { countPending } from "@/lib/submissions"

export const metadata = { title: "Διαχείριση", robots: { index: false } }

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [user, t] = await Promise.all([requireUser(), getAdminT()])
  const admin = isAdmin(user.role)
  const pending = admin ? await countPending() : 0
  const role = isRole(user.role) ? user.role : "user"

  return (
    <AdminLangProvider lang={t.lang}>
      <div className="min-h-dvh bg-muted/30 md:grid md:grid-cols-[248px_minmax(0,1fr)]">
        <AdminSidebar role={role} pending={pending}
          account={<UserMenu name={user.name} email={user.email} roleLabel={ROLE_LABELS[role]} />} />
        <div className="min-w-0">
          <NameDayBar days={nameDaysAround(t.lang)} lang={t.lang} className="md:px-6" />
          <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            {!admin && !user.approved && (
              <Alert className="mb-6 border-gold/50 bg-accent">
                <AlertTitle>{t("admin.noProposals.title")}</AlertTitle>
                <AlertDescription>{t("admin.noProposals.text")}</AlertDescription>
              </Alert>
            )}
            {children}
          </main>
        </div>
      </div>
    </AdminLangProvider>
  )
}
