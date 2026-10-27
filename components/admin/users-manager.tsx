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
import { useAdminT } from "@/components/i18n-provider"

type U = { id: string; name: string; email: string; role: string; approved: boolean; emailVerified: boolean; banned: boolean; createdAt: string }

export function UsersManager({ users, meId, superadmin }: { users: U[]; meId: string; superadmin: boolean }) {
  const router = useRouter()
  const t = useAdminT()
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
            <CardTitle className="font-heading text-lg">{t("admin.users.all")}</CardTitle>
            <CardDescription>
              {t("admin.users.intro")}{" "}
              {superadmin ? t("admin.users.introSuper") : t("admin.users.introAdmin")}
            </CardDescription>
          </div>
          {superadmin && <CreateUser onDone={() => router.refresh()} />}
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.users.user")}</TableHead>
              <TableHead>{t("admin.users.role")}</TableHead>
              <TableHead>{t("admin.users.status")}</TableHead>
              <TableHead className="text-right">{t("admin.users.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const me = u.id === meId
              const role: Role = isRole(u.role) ? u.role : "user"
              return (
                <TableRow key={u.id}>
                  <TableCell className="whitespace-normal">
                    <span className="font-semibold">{u.name}</span>{me && <span className="text-muted-foreground"> {t("admin.users.you")}</span>}
                    <span className="block text-sm text-muted-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    {superadmin && !me ? (
                      <Select value={role} onValueChange={(r) => act(() => authClient.admin.setRole({ userId: u.id, role: r as Role }), t("admin.users.newRole", { role: t(ROLE_LABELS[r as Role]) }))}>
                        <SelectTrigger size="sm" className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{t(ROLE_LABELS[r])}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={role === "user" ? "secondary" : "default"}>{role !== "user" && <ShieldCheck />}{t(ROLE_LABELS[role])}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.banned ? <Badge className="bg-crimson/10 text-crimson">{t("admin.users.banned")}</Badge>
                      : !u.emailVerified ? <Badge className="bg-secondary text-muted-foreground">{t("admin.users.unverified")}</Badge>
                      : role !== "user" || u.approved ? <Badge className="bg-gold/20 text-foreground">{t("admin.users.active")}</Badge>
                      : <Badge variant="secondary">{t("admin.users.noRight")}</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {superadmin && !u.emailVerified && !u.banned && (
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setVerifiedAction(u.id), t("admin.users.verifiedDone"))}><MailCheck />{t("admin.users.verify")}</Button>
                      )}
                      {role === "user" && u.emailVerified && !u.banned && (u.approved
                        ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setApprovedAction(u.id, false), t("admin.users.revokedDone"))}><Undo2 />{t("admin.users.revoke")}</Button>
                        : <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setApprovedAction(u.id, true), t("admin.users.restoredDone"))}><Check />{t("admin.users.restore")}</Button>)}
                      {superadmin && !me && (u.banned
                        ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => authClient.admin.unbanUser({ userId: u.id }), t("admin.users.unbannedDone"))}>{t("admin.users.unban")}</Button>
                        : <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => authClient.admin.banUser({ userId: u.id }), t("admin.users.bannedDone"))}><Ban />{t("admin.users.ban")}</Button>)}
                      {superadmin && !me && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={t("admin.delete")}><Trash2 /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin.users.deleteTitle", { name: u.name })}</AlertDialogTitle>
                              <AlertDialogDescription>{t("admin.users.deleteText")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => act(() => authClient.admin.removeUser({ userId: u.id }), t("admin.users.deletedDone"))}>{t("admin.delete")}</AlertDialogAction>
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
  const t = useAdminT()
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
      if (error) return void toast.error(error.message ?? t("admin.users.createFailed"))
      toast.success(t("admin.users.created"))
      setOpen(false)
      onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="ml-auto"><UserPlus />{t("admin.users.newAccount")}</Button></DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("admin.users.newAccount")}</DialogTitle>
            <DialogDescription>{t("admin.users.newAccountText")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5"><Label htmlFor="cu-name">{t("admin.users.fullName")}</Label><Input id="cu-name" name="name" required /></div>
          <div className="grid gap-1.5"><Label htmlFor="cu-email">{t("admin.users.email")}</Label><Input id="cu-email" name="email" type="email" required /></div>
          <div className="grid gap-1.5"><Label htmlFor="cu-pass">{t("admin.users.initialPassword")}</Label><Input id="cu-pass" name="password" type="text" minLength={8} required /></div>
          <div className="grid gap-1.5">
            <Label>{t("admin.users.role")}</Label>
            <Select value={role} onValueChange={(r) => setRole(r as Role)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{t(ROLE_LABELS[r])}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{t("admin.users.create")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
