"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MapPinned, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAdminT } from "@/components/i18n-provider"
import { BoundsField, CameraField, PairField } from "@/components/admin/geo/geo-fields"
import { deleteEditionAction, saveEditionAction } from "@/app/admin/geo-actions"
import type { Edition } from "@/lib/editions"

/** Superadmin editor for one edition (a Church): names, texts, map area, whether it is public. */
export function EditionForm({ isNew, initial, regions }: { isNew: boolean; initial: Edition; regions: { id: string; name: string }[] }) {
  const t = useAdminT()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState({ ...initial, countries: initial.countries.join(", ") })
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }))

  const save = () => start(async () => {
    const r = await saveEditionAction(isNew, v)
    if (!r.ok) return void toast.error(r.error)
    toast.success(t("geo.saved"))
    if (isNew) router.push(`/admin/editions/${r.id}`)
    else router.refresh()
  })
  const remove = () => start(async () => {
    if (!confirm(t("geo.confirmDelete"))) return
    const r = await deleteEditionAction(initial.id)
    if (!r.ok) return void toast.error(r.error)
    router.push("/admin/editions")
  })

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">{t("geo.details")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ed-id">{t("geo.id")}</Label>
            <Input id="ed-id" value={v.id} disabled={!isNew} onChange={(e) => set("id", e.target.value.toLowerCase())} placeholder="constantinople" />
            <p className="text-xs text-muted-foreground">{t("geo.idHint", { example: `/${v.id || "constantinople"}` })}</p>
          </div>
          <div className="flex items-center gap-3 self-center">
            <Switch id="ed-active" checked={v.active} onCheckedChange={(x) => set("active", x)} />
            <Label htmlFor="ed-active">{t("geo.publicLong")}</Label>
          </div>
          <PairField id="ed-name" label={t("geo.name")} value={v.name} onChange={(x) => set("name", x)} />
          <PairField id="ed-church" label={t("geo.church")} value={v.church} onChange={(x) => set("church", x)} />
          <PairField id="ed-title" label={t("geo.title")} value={v.title} onChange={(x) => set("title", x)} hint={t("geo.titleHint")} />
          <PairField id="ed-intro" label={t("geo.intro")} value={v.intro} onChange={(x) => set("intro", x)} multiline hint={t("geo.introHint")} />
          <div className="grid gap-1.5">
            <Label htmlFor="ed-sort">{t("geo.sort")}</Label>
            <Input id="ed-sort" type="number" value={v.sort} onChange={(e) => set("sort", Number(e.target.value))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ed-countries">{t("geo.countries")}</Label>
            <Input id="ed-countries" value={v.countries} onChange={(e) => set("countries", e.target.value)} placeholder="TR, GR" />
            <p className="text-xs text-muted-foreground">{t("geo.countriesHint")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">{t("geo.mapArea")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <BoundsField value={v.bounds} onChange={(b) => set("bounds", b)} />
          <div className="grid gap-1.5">
            <Label>{t("geo.camera")}</Label>
            <CameraField value={v.camera} onChange={(c) => set("camera", c)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("geo.defaultRegion")}</Label>
            <Select value={v.defaultRegion ?? "all"} onValueChange={(r) => set("defaultRegion", r === "all" ? null : r)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("geo.wholeEdition")}</SelectItem>
                {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{t("geo.save")}</Button>
        {!isNew && <Button asChild variant="outline"><Link href={`/admin/regions?edition=${initial.id}`}><MapPinned />{t("geo.manageRegions")}</Link></Button>}
        {!isNew && <Button variant="ghost" className="ml-auto text-destructive" onClick={remove} disabled={pending}><Trash2 />{t("geo.delete")}</Button>}
      </div>
    </div>
  )
}
