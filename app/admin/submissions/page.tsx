import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/admin/status-badge"
import { isAdmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { listSubmissions } from "@/lib/submissions"
import { getAdminT } from "@/lib/i18n-server"

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const status = (await searchParams).status
  const filter = status === "approved" || status === "rejected" || status === "pending" ? status : admin ? "pending" : undefined
  const [rows, t] = await Promise.all([listSubmissions({ status: filter, authorId: admin ? undefined : user.id }), getAdminT()])
  const statusTabs = [["pending", t("editor.status.pending")], ["approved", t("editor.subs.approvedPl")], ["rejected", t("editor.subs.rejectedPl")]]
  const tabs = admin ? statusTabs : [["", t("editor.subs.all")], ...statusTabs]

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t(admin ? "editor.subs.title" : "editor.subs.mine")}</h1>
      <div className="flex w-fit gap-1 rounded-lg border bg-muted p-0.5 text-sm">
        {tabs.map(([k, l]) => (
          <Link key={k} href={k ? `?status=${k}` : "?"} className={`rounded-md px-3 py-1 ${(filter ?? "") === k ? "bg-card font-semibold shadow-sm" : "text-muted-foreground"}`}>{l}</Link>
        ))}
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("editor.subs.church")}</TableHead>
              <TableHead>{t("editor.subs.kind")}</TableHead>
              {admin && <TableHead className="hidden md:table-cell">{t("editor.subs.from")}</TableHead>}
              <TableHead className="hidden md:table-cell">{t("editor.subs.date")}</TableHead>
              <TableHead>{t("editor.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t("editor.subs.none")}</TableCell></TableRow>
            )}
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-normal">
                  <Link href={`/admin/submissions/${s.id}`} className="font-semibold hover:underline">
                    {s.payload.site.content[t.lang].name || s.payload.site.content.el.name || s.payload.site.content.en.name}
                  </Link>
                  {s.payload.photos.length > 0 && <span className="block text-xs text-muted-foreground">{t("editor.subs.photos", { n: s.payload.photos.length })}</span>}
                </TableCell>
                <TableCell>{t(s.kind === "create" ? "editor.subs.kindCreate" : "editor.subs.kindUpdate")}</TableCell>
                {admin && <TableCell className="hidden md:table-cell">{s.authorName}</TableCell>}
                <TableCell className="hidden text-muted-foreground md:table-cell">{s.createdAt.slice(0, 16)}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
