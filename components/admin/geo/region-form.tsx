"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Crop, Loader2, Save, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAdminT } from "@/components/i18n-provider"
import { BoundsField, CameraField, PairField } from "@/components/admin/geo/geo-fields"
import { deleteRegionAction, saveRegionAction } from "@/app/admin/geo-actions"
import type { Bounds } from "@/lib/editions"
import type { Region } from "@/lib/regions"

type Polys = number[][][][]

// The rings of a pasted/uploaded outline (GeoJSON geometry, Feature or FeatureCollection), or null.
function rings(text: string | null): Polys | null {
  if (!text) return null
  try {
    let g = JSON.parse(text)
    if (g.type === "FeatureCollection") g = g.features?.find((f: { geometry?: { type?: string } }) => /Polygon/.test(f.geometry?.type ?? ""))?.geometry
    else if (g.type === "Feature") g = g.geometry
    if (g?.type === "Polygon") return [g.coordinates]
    if (g?.type === "MultiPolygon") return g.coordinates
  } catch {}
  return null
}

function polyBounds(polys: Polys): Bounds {
  let s = 90, w = 180, n = -90, e = -180
  for (const p of polys) for (const [lng, lat] of p[0]) { s = Math.min(s, lat); n = Math.max(n, lat); w = Math.min(w, lng); e = Math.max(e, lng) }
  const r = (x: number) => Math.round(x * 100) / 100
  return [[r(s), r(w)], [r(n), r(e)]]
}

/** A quick drawing of the outline (equirectangular, corrected for latitude) with the map area as a dashed box. */
function OutlinePreview({ polys, bounds }: { polys: Polys | null; bounds: Bounds }) {
  const [[s, w], [n, e]] = polys ? polyBounds(polys) : bounds
  const pad = 0.05 * Math.max(n - s, e - w)
  const k = Math.cos(((s + n) / 2) * Math.PI / 180)
  const x = (lng: number) => (lng - w + pad) * k, y = (lat: number) => n + pad - lat
  const width = (e - w + 2 * pad) * k, height = n - s + 2 * pad
  const [[bs, bw], [bn, be]] = bounds
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full rounded-lg border bg-muted/50" preserveAspectRatio="xMidYMid meet">
      {polys?.map((p, i) => (
        <path key={i} d={p.map((ring) => `M${ring.map(([lng, lat]) => `${x(lng)},${y(lat)}`).join("L")}Z`).join("")} fillRule="evenodd" className="fill-primary/15 stroke-primary" strokeWidth={height / 300} />
      ))}
      <rect x={x(bw)} y={y(bn)} width={(be - bw) * k} height={bn - bs} className="fill-none stroke-gold-deep" strokeWidth={height / 300} strokeDasharray={`${height / 60} ${height / 90}`} />
    </svg>
  )
}

/** Superadmin editor for one region: names, parent, map area, outline, whether it is public. */
export function RegionForm({ isNew, initial, boundary, editions, parents }: {
  isNew: boolean; initial: Region; boundary: string | null
  editions: { id: string; name: string }[]; parents: { id: string; edition: string; name: string }[]
}) {
  const t = useAdminT()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState(initial)
  const set = <K extends keyof Region>(k: K, val: Region[K]) => setV((x) => ({ ...x, [k]: val }))
  // undefined = unchanged, null = removed, string = new outline
  const [outline, setOutline] = useState<string | null | undefined>(undefined)
  const [paste, setPaste] = useState("")
  const shown = outline === undefined ? boundary : outline
  const polys = useMemo(() => rings(shown), [shown])

  const applyOutline = (text: string) => {
    const p = rings(text)
    if (!p) return void toast.error(t("geo.error.outline"))
    setOutline(text)
    setV((x) => ({ ...x, bounds: polyBounds(p) }))
  }
  const upload = (file: File | undefined) => file?.text().then(applyOutline)

  const save = () => start(async () => {
    const r = await saveRegionAction(isNew, { ...v, boundary: outline })
    if (!r.ok) return void toast.error(r.error)
    toast.success(t("geo.saved"))
    if (isNew) router.push(`/admin/regions/${r.id}`)
    else { setOutline(undefined); router.refresh() }
  })
  const remove = () => start(async () => {
    if (!confirm(t("geo.confirmDelete"))) return
    const r = await deleteRegionAction(initial.id)
    if (!r.ok) return void toast.error(r.error)
    router.push(`/admin/regions?edition=${initial.edition}`)
  })

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">{t("geo.details")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="rg-id">{t("geo.id")}</Label>
            <Input id="rg-id" value={v.id} disabled={!isNew} onChange={(e) => set("id", e.target.value.toLowerCase())} placeholder="nicosia" />
            <p className="text-xs text-muted-foreground">{t("geo.regionIdHint")}</p>
          </div>
          <div className="flex items-center gap-3 self-center">
            <Switch id="rg-active" checked={v.active} onCheckedChange={(x) => set("active", x)} />
            <Label htmlFor="rg-active">{t("geo.regionPublic")}</Label>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("geo.edition")}</Label>
            <Select value={v.edition} onValueChange={(x) => setV((r) => ({ ...r, edition: x, parent: null }))} disabled={!isNew}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{editions.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("geo.parent")}</Label>
            <Select value={v.parent ?? "none"} onValueChange={(x) => set("parent", x === "none" ? null : x)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("geo.noParent")}</SelectItem>
                {parents.filter((p) => p.edition === v.edition).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <PairField id="rg-name" label={t("geo.name")} value={v.name} onChange={(x) => set("name", x)} />
          <div className="grid gap-1.5">
            <Label htmlFor="rg-sort">{t("geo.sort")}</Label>
            <Input id="rg-sort" type="number" value={v.sort} onChange={(e) => set("sort", Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">{t("geo.mapArea")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-4">
            <OutlinePreview polys={polys} bounds={v.bounds} />
            <p className="text-xs text-muted-foreground">{polys ? t("geo.outlinePoints", { n: polys.reduce((a, p) => a + p.reduce((b, r) => b + r.length, 0), 0) }) : t("geo.noOutline")}</p>
          </div>
          <div className="grid content-start gap-4 sm:grid-cols-2">
            <BoundsField value={v.bounds} onChange={(b) => set("bounds", b)} />
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>{t("geo.camera")}</Label>
              <CameraField value={v.camera} onChange={(c) => set("camera", c)} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("geo.outline")}</Label>
              <p className="text-xs text-muted-foreground">{t("geo.outlineHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><label className="cursor-pointer"><Upload />{t("geo.uploadOutline")}<input type="file" accept=".geojson,.json,application/geo+json,application/json" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} /></label></Button>
                {polys && <Button variant="outline" size="sm" onClick={() => set("bounds", polyBounds(polys))}><Crop />{t("geo.fitOutline")}</Button>}
                {shown && <Button variant="ghost" size="sm" onClick={() => setOutline(null)}><X />{t("geo.removeOutline")}</Button>}
              </div>
              <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{"type":"Polygon","coordinates":[…]}' className="min-h-20 font-mono text-xs" />
              {paste.trim() && <Button variant="outline" size="sm" className="justify-self-start" onClick={() => { applyOutline(paste); setPaste("") }}>{t("geo.useOutline")}</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{t("geo.save")}</Button>
        {!isNew && <Button variant="ghost" className="ml-auto text-destructive" onClick={remove} disabled={pending}><Trash2 />{t("geo.delete")}</Button>}
      </div>
    </div>
  )
}
