"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TypeBadge, typeText } from "@/components/type-badge"
import type { SiteType } from "@/lib/content"
import { cn } from "@/lib/utils"

type Row = {
  id: number; slug: string; type: SiteType; cover: string | null; published: boolean; coordsVerified: boolean
  nameEl: string; nameEn: string; region: string; updatedAt: string
}

const fold = (s: string) => s.toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "")

export function SitesTable({ rows, admin }: { rows: Row[]; admin: boolean }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<"all" | "published" | "draft">("all")
  const shown = useMemo(() => rows.filter((r) =>
    (status === "all" || (status === "published") === r.published) &&
    fold(`${r.nameEl} ${r.nameEn} ${r.slug} ${r.region}`).includes(fold(q))), [rows, q, status])

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Φιλτράρισμα…" className="pl-8" />
        </div>
        {admin && (
          <div className="flex gap-1 rounded-lg border bg-muted p-0.5 text-sm">
            {([["all", "Όλα"], ["published", "Δημοσιευμένα"], ["draft", "Πρόχειρα"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setStatus(k)}
                className={cn("rounded-md px-3 py-1 text-muted-foreground", status === k && "bg-card font-semibold text-foreground shadow-sm")}>{l}</button>
            ))}
          </div>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{shown.length} από {rows.length}</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16" />
            <TableHead>Όνομα</TableHead>
            <TableHead className="hidden md:table-cell">Τύπος</TableHead>
            <TableHead className="hidden lg:table-cell">Περιοχή</TableHead>
            {admin && <TableHead>Κατάσταση</TableHead>}
            <TableHead className="hidden lg:table-cell">Ενημέρωση</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((r) => (
            <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/admin/sites/${r.id}`)}>
              <TableCell>
                {r.cover
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.cover} alt="" className="size-11 rounded-md border object-cover" />
                  : <span className={cn("grid size-11 place-items-center rounded-md border bg-muted", typeText[r.type])}>✝</span>}
              </TableCell>
              <TableCell className="whitespace-normal">
                <span className="font-semibold">{r.nameEl || r.nameEn}</span>
                {r.nameEn && <span className="block text-sm text-muted-foreground">{r.nameEn}</span>}
              </TableCell>
              <TableCell className="hidden md:table-cell"><TypeBadge type={r.type} lang="el" /></TableCell>
              <TableCell className="hidden lg:table-cell">{r.region}</TableCell>
              {admin && (
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    {r.published ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Δημοσιευμένο</Badge> : <Badge variant="secondary">Πρόχειρο</Badge>}
                    {!r.coordsVerified && <span className="flex items-center gap-1 text-xs text-muted-foreground"><TriangleAlert className="size-3 text-gold" />θέση κατά προσέγγιση</span>}
                  </div>
                </TableCell>
              )}
              <TableCell className="hidden text-muted-foreground lg:table-cell">{r.updatedAt.slice(0, 16)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
