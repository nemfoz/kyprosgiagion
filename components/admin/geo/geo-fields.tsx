"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAdminT } from "@/components/i18n-provider"
import type { Lang } from "@/lib/content"
import type { Bounds, Camera } from "@/lib/editions"

// Shared fields of the edition and region editors.

/** A text in Greek and English side by side. */
export function PairField({ id, label, value, onChange, multiline, hint }: {
  id: string; label: string; value: Record<Lang, string>; onChange: (v: Record<Lang, string>) => void; multiline?: boolean; hint?: string
}) {
  const Field = multiline ? Textarea : Input
  return (
    <div className="grid gap-1.5 sm:col-span-2">
      <Label htmlFor={`${id}-el`}>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["el", "en"] as const).map((l) => (
          <div key={l} className="relative">
            <Field id={`${id}-${l}`} value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} className={multiline ? "min-h-24 pr-10" : "pr-10"} />
            <span className="pointer-events-none absolute top-2 right-2.5 text-[10px] font-semibold text-muted-foreground uppercase">{l}</span>
          </div>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** The map area: south/west/north/east, as typed numbers. */
export function BoundsField({ value, onChange }: { value: Bounds; onChange: (b: Bounds) => void }) {
  const t = useAdminT()
  const [[s, w], [n, e]] = value
  const set = (i: 0 | 1, j: 0 | 1, v: string) => {
    const b = value.map((p) => [...p]) as Bounds
    b[i][j] = Number(v)
    onChange(b)
  }
  const cells: [string, 0 | 1, 0 | 1, number][] = [["geo.south", 0, 0, s], ["geo.west", 0, 1, w], ["geo.north", 1, 0, n], ["geo.east", 1, 1, e]]
  return (
    <div className="grid gap-1.5 sm:col-span-2">
      <Label>{t("geo.bounds")}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map(([key, i, j, v]) => (
          <label key={key} className="grid gap-1 text-xs text-muted-foreground">
            {t(key as Parameters<typeof t>[0])}
            <Input type="number" step="0.01" value={Number.isFinite(v) ? v : ""} onChange={(ev) => set(i, j, ev.target.value)} />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("geo.boundsHint")}</p>
    </div>
  )
}

/** The 3D view's rotation and tilt (optional). */
export function CameraField({ value, onChange }: { value: Camera | null; onChange: (c: Camera | null) => void }) {
  const t = useAdminT()
  const num = (v: string) => (v === "" ? undefined : Number(v))
  const set = (k: keyof Camera, v: string) => {
    const next = { bearing: value?.bearing ?? 0, pitch: value?.pitch ?? 50, [k]: num(v) }
    onChange(next.bearing === undefined && next.pitch === undefined ? null : { bearing: next.bearing ?? 0, pitch: next.pitch ?? 50 })
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="grid gap-1 text-xs text-muted-foreground">{t("geo.bearing")}<Input type="number" step="1" value={value?.bearing ?? ""} onChange={(e) => set("bearing", e.target.value)} /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">{t("geo.pitch")}<Input type="number" step="1" value={value?.pitch ?? ""} onChange={(e) => set("pitch", e.target.value)} /></label>
    </div>
  )
}
