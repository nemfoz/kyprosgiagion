"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { savePointsAction } from "@/app/admin/actions"
import { BONUSES, LEVEL_NAMES, PAGE_POINTS, SECTIONS, validatePoints, type BonusKey, type PointsConfig } from "@/lib/completeness"
import { cn } from "@/lib/utils"

function NumberField({ value, onChange, id }: { value: number; onChange: (n: number) => void; id: string }) {
  return (
    <Input id={id} type="number" min={0} step={1} value={Number.isFinite(value) ? value : ""} className="h-8 w-24 text-right"
      onChange={(e) => onChange(e.target.value === "" ? NaN : Math.round(Number(e.target.value)))} />
  )
}

function Row({ id, label, hint, children }: { id: string; label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <label htmlFor={id} className="grid text-sm">{label}{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</label>
      {children}
    </div>
  )
}

/** Superadmin editor for the point values; saving recalculates everyone's points. */
export function PointsForm({ initial, defaults }: { initial: PointsConfig; defaults: PointsConfig }) {
  const router = useRouter()
  const [cfg, setCfg] = useState(initial)
  const [pending, start] = useTransition()
  const sum = Object.values(cfg.sections).reduce((n, v) => n + (v || 0), 0)
  const invalid = [...Object.values(cfg.sections), ...Object.values(cfg.bonuses), cfg.proposal, ...cfg.levels].some((v) => !Number.isFinite(v))
  const errors = invalid ? ["Συμπληρώστε όλα τα πεδία."] : validatePoints(cfg)
  const changed = JSON.stringify(cfg) !== JSON.stringify(initial)

  function save() {
    start(async () => {
      const r = await savePointsAction(cfg)
      if (!r.ok) return void toast.error(r.error)
      toast.success(`Αποθηκεύτηκε · επανυπολογίστηκαν ${r.recalculated} εγκεκριμένες προτάσεις`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Ενότητες σελίδας</CardTitle>
          <CardDescription>
            Πόντοι ανά γλώσσα· πρέπει να έχουν άθροισμα {PAGE_POINTS}. Φωτογραφία, θέση και πηγές ισχύουν και για τις δύο γλώσσες, άρα ο συνεισφέρων κερδίζει το διπλάσιο.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid divide-y">
          {SECTIONS.map((s) => (
            <Row key={s.key} id={`s-${s.key}`} hint={s.shared ? `και οι δύο γλώσσες · κερδίζει ${(cfg.sections[s.key] || 0) * 2}` : undefined} label={s.label.el}>
              <NumberField id={`s-${s.key}`} value={cfg.sections[s.key]} onChange={(n) => setCfg((c) => ({ ...c, sections: { ...c.sections, [s.key]: n } }))} />
            </Row>
          ))}
          <div className={cn("flex justify-between pt-2 text-sm font-semibold", sum !== PAGE_POINTS && "text-destructive")}>
            <span>Σύνολο ανά γλώσσα</span><span>{sum} / {PAGE_POINTS}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Μπόνους</CardTitle>
          <CardDescription>Πέρα από την πληρότητα της σελίδας· δεν αλλάζουν το ποσοστό της.</CardDescription>
        </CardHeader>
        <CardContent className="grid divide-y">
          {(Object.keys(BONUSES) as BonusKey[]).map((k) => (
            <Row key={k} id={`b-${k}`} label={BONUSES[k].label.el} hint={BONUSES[k].hint.el}>
              <NumberField id={`b-${k}`} value={cfg.bonuses[k]} onChange={(n) => setCfg((c) => ({ ...c, bonuses: { ...c.bonuses, [k]: n } }))} />
            </Row>
          ))}
          <Row id="proposal" label="Κάθε εγκεκριμένη πρόταση" hint="Ακόμα και για μικρές διορθώσεις.">
            <NumberField id="proposal" value={cfg.proposal} onChange={(n) => setCfg((c) => ({ ...c, proposal: n }))} />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Τίτλοι</CardTitle>
          <CardDescription>Πόσους πόντους χρειάζεται κάθε τίτλος.</CardDescription>
        </CardHeader>
        <CardContent className="grid divide-y">
          <Row id="l-0" label={LEVEL_NAMES[0].el}><span className="w-24 pr-3 text-right text-sm text-muted-foreground">0</span></Row>
          {cfg.levels.map((v, i) => (
            <Row key={i} id={`l-${i + 1}`} label={LEVEL_NAMES[i + 1].el}>
              <NumberField id={`l-${i + 1}`} value={v} onChange={(n) => setCfg((c) => ({ ...c, levels: c.levels.map((x, j) => (j === i ? n : x)) }))} />
            </Row>
          ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur lg:col-span-2">
        <Button onClick={save} disabled={pending || !changed || errors.length > 0}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}Αποθήκευση και επανυπολογισμός
        </Button>
        <Button variant="ghost" onClick={() => setCfg(initial)} disabled={!changed || pending}>Άκυρο</Button>
        <Button variant="outline" onClick={() => setCfg(defaults)} disabled={pending}><RotateCcw />Αρχικές τιμές</Button>
        {errors.length > 0 && <p className="text-sm text-destructive">{errors.join(" ")}</p>}
      </div>
    </div>
  )
}
