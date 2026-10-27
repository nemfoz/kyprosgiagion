"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Ban, Check, Loader2, MailCheck, ShieldCheck, Trash2, UserPlus, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { setApprovedAction, setVerifiedAction } from "@/app/admin/actions"
import { authClient } from "@/lib/auth-client"
import { isRole, ROLE_LABELS, ROLES, type Role } from "@/lib/permissions"

type U = { id: string; name: string; email: string; role: string; approved: boolean; emailVerified: boolean; banned: boolean; createdAt: string }

export function UsersManager({ users, meId, superadmin }: { users: U[]; meId: string; superadmin: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  // Superadmin operations go through Better Auth's admin API, which checks the permission on the server.
  const act = (fn: () => Promise<{ error?: { message?: string } | null } | { ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await fn()
      const err = "ok" in r ? (r.ok ? null : r.error) : r.error?.message
      if (err) return void toast.error(err)
      toast.success(done)
      router.refresh()
    })

  return (
    <div className="grid gap-6">
      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="flex flex-row flex-wrap items-center gap-3 pb-4">
          <div>
            <CardTitle className="font-heading text-lg">Όλοι οι χρήστες</CardTitle>
            <CardDescription>
              Οι νέοι λογαριασμοί ενεργοποιούνται μόλις ο χρήστης επιβεβαιώσει το e-mail του.{" "}
              {superadmin ? "Ως υπερδιαχειριστής ορίζετε ρόλους, δημιουργείτε διαχειριστές και απενεργοποιείτε λογαριασμούς." : "Η διαχείριση ρόλων γίνεται από υπερδιαχειριστή."}
            </CardDescription>
          </div>
          {superadmin && <CreateUser onDone={() => router.refresh()} />}
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Χρήστης</TableHead>
              <TableHead>Ρόλος</TableHead>
              <TableHead>Κατάσταση</TableHead>
              <TableHead className="text-right">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const me = u.id === meId
              const role: Role = isRole(u.role) ? u.role : "user"
              return (
                <TableRow key={u.id}>
                  <TableCell className="whitespace-normal">
                    <span className="font-semibold">{u.name}</span>{me && <span className="text-muted-foreground"> (εσείς)</span>}
                    <span className="block text-sm text-muted-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    {superadmin && !me ? (
                      <Select value={role} onValueChange={(r) => act(() => authClient.admin.setRole({ userId: u.id, role: r as Role }), `Νέος ρόλος: ${ROLE_LABELS[r as Role]}`)}>
                        <SelectTrigger size="sm" className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={role === "user" ? "secondary" : "default"}>{role !== "user" && <ShieldCheck />}{ROLE_LABELS[role]}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.banned ? <Badge className="bg-crimson/10 text-crimson">Απενεργοποιημένος</Badge>
                      : !u.emailVerified ? <Badge className="bg-secondary text-muted-foreground">Δεν επιβεβαίωσε e-mail</Badge>
                      : role !== "user" || u.approved ? <Badge className="bg-gold/20 text-foreground">Ενεργός</Badge>
                      : <Badge variant="secondary">Χωρίς δικαίωμα προτάσεων</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {superadmin && !u.emailVerified && !u.banned && (
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setVerifiedAction(u.id), "Το e-mail επιβεβαιώθηκε χειροκίνητα")}><MailCheck />Επιβεβαίωση e-mail</Button>
                      )}
                      {role === "user" && u.emailVerified && !u.banned && (u.approved
                        ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setApprovedAction(u.id, false), "Αφαιρέθηκε το δικαίωμα προτάσεων")}><Undo2 />Αφαίρεση δικαιώματος</Button>
                        : <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setApprovedAction(u.id, true), "Το δικαίωμα προτάσεων επανήλθε")}><Check />Επαναφορά δικαιώματος</Button>)}
                      {superadmin && !me && (u.banned
                        ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => authClient.admin.unbanUser({ userId: u.id }), "Ο λογαριασμός ενεργοποιήθηκε")}>Ενεργοποίηση</Button>
                        : <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => authClient.admin.banUser({ userId: u.id }), "Ο λογαριασμός απενεργοποιήθηκε")}><Ban />Απενεργοποίηση</Button>)}
                      {superadmin && !me && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Διαγραφή"><Trash2 /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Διαγραφή του {u.name};</AlertDialogTitle>
                              <AlertDialogDescription>Ο λογαριασμός διαγράφεται οριστικά. Οι προτάσεις του παραμένουν στο ιστορικό.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Άκυρο</AlertDialogCancel>
                              <AlertDialogAction onClick={() => act(() => authClient.admin.removeUser({ userId: u.id }), "Ο χρήστης διαγράφηκε")}>Διαγραφή</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function CreateUser({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>("admin")
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    start(async () => {
      const { error } = await authClient.admin.createUser({
        name: String(f.get("name")), email: String(f.get("email")), password: String(f.get("password")),
        role, data: { approved: true, emailVerified: true },
      })
      if (error) return void toast.error(error.message ?? "Η δημιουργία απέτυχε")
      toast.success("Ο λογαριασμός δημιουργήθηκε")
      setOpen(false)
      onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="ml-auto"><UserPlus />Νέος λογαριασμός</Button></DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Νέος λογαριασμός</DialogTitle>
            <DialogDescription>Ο λογαριασμός είναι αμέσως ενεργός (χωρίς επιβεβαίωση e-mail). Δώστε στον χρήστη τον κωδικό· μπορεί να τον αλλάξει με «Ξεχάσατε τον κωδικό;».</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5"><Label htmlFor="cu-name">Ονοματεπώνυμο</Label><Input id="cu-name" name="name" required /></div>
          <div className="grid gap-1.5"><Label htmlFor="cu-email">E-mail</Label><Input id="cu-email" name="email" type="email" required /></div>
          <div className="grid gap-1.5"><Label htmlFor="cu-pass">Αρχικός κωδικός</Label><Input id="cu-pass" name="password" type="text" minLength={8} required /></div>
          <div className="grid gap-1.5">
            <Label>Ρόλος</Label>
            <Select value={role} onValueChange={(r) => setRole(r as Role)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Δημιουργία</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
