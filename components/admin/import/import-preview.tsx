"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { CircleAlert, CircleCheck, Copy, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAdminT } from "@/components/i18n-provider"
import { checkImportAction, commitImportAction } from "@/app/admin/import-actions"
import type { CheckedRow, ImportDefaults } from "@/lib/church-import"
import type { MessageKey } from "@/lib/i18n"

const CHUNK = 20

/**
 * The preview before an import: every row checked on the server (coordinates from map links, problems, likely
 * duplicates). New rows are ticked, duplicates aren't; "Add" creates the ticked ones in batches.
 */
export function ImportPreview({ rows, defaults, onDone }: { rows: Record<string, unknown>[]; defaults: ImportDefaults; onDone?: () => void }) {
  const t = useAdminT()
  const [checked, setChecked] = useState<CheckedRow[] | null>(null)
  const [chosen, setChosen] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [added, setAdded] = useState<{ index: number; id: number; slug: string }[]>([])
  const [checking, start] = useTransition()

  useEffect(() => {
    let cancelled = false
    start(async () => {
      const r = await checkImportAction(rows, defaults)
      if (cancelled) return
      if (!r.ok) return void toast.error(r.error)
      setChecked(r.rows)
      setChosen(new Set(r.rows.filter((x) => x.status === "ok").map((x) => x.index)))
      setAdded([])
    })
    return () => { cancelled = true }
  }, [rows, defaults])

  async function add() {
    if (!checked) return
    const list = checked.filter((c) => chosen.has(c.index))
    setProgress({ done: 0, total: list.length })
    let photos = 0, photoErrors = 0, failed = 0
    const done: typeof added = []
    for (let i = 0; i < list.length; i += CHUNK) {
      const part = list.slice(i, i + CHUNK)
      const r = await commitImportAction(part.map((c) => rows[c.index]), defaults, true)
      if (!r.ok) { toast.error(r.error); break }
      // The server numbers rows within the batch: map them back.
      done.push(...r.added.map((a) => ({ ...a, index: part[a.index].index })))
      photos += r.photos; photoErrors += r.photoErrors; failed += r.failed.length
      setProgress({ done: Math.min(i + CHUNK, list.length), total: list.length })
    }
    setAdded((x) => [...x, ...done])
    setChosen(new Set())
    setProgress(null)
    toast.success(t("import.addedSummary", { n: done.length, photos, photoErrors, failed }))
    onDone?.()
  }

  if (!checked) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t("import.checking", { n: rows.length })}</p>
  const counts = { ok: 0, duplicate: 0, error: 0 }
  for (const c of checked) counts[c.status]++
  const addedAt = new Map(added.map((a) => [a.index, a]))
  const toggleAll = (status: CheckedRow["status"], on: boolean) =>
    setChosen((s) => { const n = new Set(s); for (const c of checked) if (c.status === status && !addedAt.has(c.index)) { if (on) n.add(c.index); else n.delete(c.index) } return n })

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary" className="gap-1"><CircleCheck className="size-3.5 text-primary" />{t("import.new", { n: counts.ok })}</Badge>
        <Badge variant="secondary" className="gap-1"><Copy className="size-3.5" />{t("import.duplicates", { n: counts.duplicate })}</Badge>
        <Badge variant="secondary" className="gap-1"><CircleAlert className="size-3.5 text-destructive" />{t("import.errors", { n: counts.error })}</Badge>
        {counts.duplicate > 0 && <Button variant="ghost" size="sm" onClick={() => toggleAll("duplicate", true)}>{t("import.tickDuplicates")}</Button>}
        <Button className="ml-auto" onClick={add} disabled={!chosen.size || !!progress || checking}>
          {progress ? <><Loader2 className="animate-spin" />{progress.done} / {progress.total}</> : <><Plus />{t(defaults.published ? "import.addPublished" : "import.addDrafts", { n: chosen.size })}</>}
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b bg-card text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-8 p-2" />
              <th className="p-2 font-medium">{t("import.col.name")}</th>
              <th className="p-2 font-medium">{t("import.col.place")}</th>
              <th className="p-2 font-medium">{t("import.col.location")}</th>
              <th className="p-2 font-medium">{t("import.col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {checked.map((c) => {
              const done = addedAt.get(c.index)
              return (
                <tr key={c.index} className="border-b align-top last:border-0">
                  <td className="p-2">
                    {done ? <CircleCheck className="size-4 text-primary" /> : (
                      <Checkbox checked={chosen.has(c.index)} disabled={c.status === "error"}
                        onCheckedChange={(on) => setChosen((s) => { const n = new Set(s); if (on) n.add(c.index); else n.delete(c.index); return n })} />
                    )}
                  </td>
                  <td className="p-2">
                    <b className="font-medium">{c.row.name_el || c.row.name_en}</b>
                    {c.row.name_en && c.row.name_el && <span className="block text-xs text-muted-foreground">{c.row.name_en}</span>}
                    {c.row.image && <span className="text-xs text-muted-foreground">📷 </span>}
                  </td>
                  <td className="p-2 text-xs">{c.row.location_el || c.row.location_en}<span className="block text-muted-foreground">{c.region}{c.see ? ` · ${c.see}` : ""}</span></td>
                  <td className="p-2 text-xs whitespace-nowrap">
                    {c.row.lat != null ? <a className="text-primary underline-offset-2 hover:underline" target="_blank" href={`https://www.google.com/maps?q=${c.row.lat},${c.row.lng}`}>{c.row.lat.toFixed(4)}, {c.row.lng!.toFixed(4)}</a> : "—"}
                    {c.row.coords === "approximate" && <span className="block text-muted-foreground">{t("import.approx")}</span>}
                  </td>
                  <td className="p-2 text-xs">
                    {done ? <Link href={`/admin/sites/${done.id}`} className="text-primary underline-offset-2 hover:underline">{t("import.added")}</Link>
                      : c.status === "ok" ? <span className="text-primary">{t("import.status.ok")}</span>
                        : c.status === "duplicate" ? (
                          <span>{t("import.status.duplicate")}{c.duplicateOf && <> — <Link href={`/admin/sites/${c.duplicateOf.id}`} target="_blank" className="underline underline-offset-2">{c.duplicateOf.name || c.duplicateOf.slug}</Link>{c.duplicateOf.metres != null && ` (${c.duplicateOf.metres} m)`}</>}</span>
                        ) : null}
                    {c.notes.map((n) => <span key={n} className="block text-muted-foreground">{t(n as MessageKey)}</span>)}
                    {c.problems.map((p) => <span key={p} className={`block ${c.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{t(p as MessageKey)}</span>)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
