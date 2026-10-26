import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { UserMenu } from "@/components/admin/user-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { isAdmin, isRole, ROLE_LABELS } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { countPending } from "@/lib/submissions"

export const metadata = { title: "Διαχείριση", robots: { index: false } }

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const pending = admin ? await countPending() : 0
  const role = isRole(user.role) ? user.role : "user"

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-heading text-lg font-bold whitespace-nowrap">
            <span className="text-primary">☦</span><span className="hidden sm:inline">Κύπρος – Αγίων Γη</span>
          </Link>
          <AdminNav role={role} pending={pending} />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:flex">
              Δημόσιος χάρτης <ExternalLink className="size-3.5" />
            </Link>
            <UserMenu name={user.name} email={user.email} roleLabel={ROLE_LABELS[role]} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {!admin && !user.approved && (
          <Alert className="mb-6 border-amber-300 bg-amber-50">
            <AlertTitle>Δεν μπορείτε να στείλετε προτάσεις</AlertTitle>
            <AlertDescription>Το δικαίωμα υποβολής προτάσεων του λογαριασμού σας έχει αφαιρεθεί. Επικοινωνήστε με έναν διαχειριστή.</AlertDescription>
          </Alert>
        )}
        {children}
      </main>
    </div>
  )
}
