"use client"

import { useMemo, useState, useTransition } from "react"
import { Download, ExternalLink, FileSpreadsheet, Globe2, Loader2, MapPin, Search, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAdminT } from "@/components/i18n-provider"
import { LocationPicker } from "@/components/admin/location-picker"
import type { RegionOption } from "@/components/admin/site-form"
import { ImportPreview } from "@/components/admin/import/import-preview"
import { COLUMNS, rowsFromTable } from "@/components/admin/import/columns"
import { fetchParishesAction } from "@/app/admin/import-actions"
import { SITE_TYPES, TYPE_LABELS, type SiteType } from "@/lib/content"
import { csvLine, parseTable } from "@/lib/csv"
import type { ImportDefaults } from "@/lib/church-import"

type See = { slug: string; name: string; edition: string }
type Source = { id: string; label: string; url: string; note?: string; see: string; region?: string }

/** Where new churches go when a row doesn't say: region, see, and draft or published. */
function DefaultsFields({ value, onChange, regions, sees }: { value: ImportDefaults; onChange: (d: ImportDefaults) => void; regions: RegionOption[]; sees: See[] }) {
  const t = useAdminT()
  const edition = regions.find((r) => r.id === value.region)?.edition
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="grid gap-1.5">
        <Label>{t("import.defaultRegion")}</Label>
        <Select value={value.region} onValueChange={(region) => onChange({ ...value, region, see: sees.some((s) => s.slug === value.see && s.edition === regions.find((r) => r.id === region)?.edition) ? value.see : null })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.active ? r.name : t("editor.regionInactive", { name: r.name })}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>{t("import.defaultSee")}</Label>
        <Select value={value.see ?? "none"} onValueChange={(see) => onChange({ ...value, see: see === "none" ? null : see })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {sees.filter((s) => !edition || s.edition === edition).map((s) => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <Checkbox checked={value.published} onCheckedChange={(on) => onChange({ ...value, published: !!on })} />
        {t("import.publishNow")}
      </label>
    </div>
  )
}

/** Superadmins: add churches one at a time (quick), from a spreadsheet, or from the Metropolis websites. */
export function ImportCenter({ regions, sees, sources, initialRegion }: { regions: RegionOption[]; sees: See[]; sources: Source[]; initialRegion: string }) {
  const t = useAdminT()
  const [defaults, setDefaults] = useState<ImportDefaults>({ region: initialRegion, see: null, published: false })

  // ---- quick add ----
  const [quick, setQuick] = useState({ name_el: "", name_en: "", type: "church" as SiteType, location_el: "", lat: null as number | null, lng: null as number | null, link: "" })
  const [quickRows, setQuickRows] = useState<Record<string, unknown>[] | null>(null)
  const quickArea = regions.find((r) => r.id === defaults.region)
  const checkQuick = () => {
    if (!quick.name_el && !quick.name_en) return void toast.error(t("import.problem.name"))
    setQuickRows([{ name_el: quick.name_el, name_en: quick.name_en, type: quick.type, location_el: quick.location_el, lat: quick.lat, lng: quick.lng, map_url: quick.link, coords: quick.lat != null ? "exact" : undefined }])
  }

  // ---- spreadsheet ----
  const [text, setText] = useState("")
  const [sheetRows, setSheetRows] = useState<Record<string, unknown>[] | null>(null)
  const parsed = useMemo(() => (text.trim() ? rowsFromTable(parseTable(text)) : null), [text])
  const template = () => {
    const example = ["Ιερός Ναός Αγίου Γεωργίου", "Church of Ayios Georgios", "church", "Αθηένου", "Athienou", "larnaca", "kition", "35.0615", "33.5420", "", "exact", "", "", "", "https://example.org/page", "Ιερά Μητρόπολη Κιτίου"]
    const blob = new Blob(["﻿" + [csvLine(COLUMNS.map((c) => c.key)), csvLine(example)].join("\n")], { type: "text/csv;charset=utf-8" })
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "odoiporiko-churches.csv" })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ---- websites ----
  const [webRows, setWebRows] = useState<{ source: string; rows: Record<string, unknown>[]; log: string[] } | null>(null)
  const [fetching, startFetch] = useTransition()
  const [fetchingId, setFetchingId] = useState<string | null>(null)
  const fetchSource = (s: Source) => {
    setFetchingId(s.id)
    startFetch(async () => {
      const r = await fetchParishesAction(s.id)
      setFetchingId(null)
      if (!r.ok) return void toast.error(r.error)
      if (s.region) setDefaults((d) => ({ ...d, region: s.region!, see: s.see }))
      setWebRows({ source: s.id, rows: r.rows, log: r.log })
    })
  }

  return (
    <Tabs defaultValue="quick" className="gap-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="quick"><Zap />{t("import.tab.quick")}</TabsTrigger>
        <TabsTrigger value="sheet"><FileSpreadsheet />{t("import.tab.sheet")}</TabsTrigger>
        <TabsTrigger value="web"><Globe2 />{t("import.tab.web")}</TabsTrigger>
      </TabsList>

      <Card>
        <CardContent><DefaultsFields value={defaults} onChange={(d) => { setDefaults(d); setQuickRows(null); setSheetRows(null) }} regions={regions} sees={sees} /></CardContent>
      </Card>

      <TabsContent value="quick" className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{t("import.tab.quick")}</CardTitle><CardDescription>{t("import.quickIntro")}</CardDescription></CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <div className="grid gap-1.5"><Label htmlFor="q-el">{t("import.col.nameEl")}</Label><Input id="q-el" value={quick.name_el} onChange={(e) => setQuick((q) => ({ ...q, name_el: e.target.value }))} placeholder="Ιερός Ναός Αγίου Γεωργίου" /></div>
              <div className="grid gap-1.5"><Label htmlFor="q-en">{t("import.col.nameEn")}</Label><Input id="q-en" value={quick.name_en} onChange={(e) => setQuick((q) => ({ ...q, name_en: e.target.value }))} placeholder="Church of Ayios Georgios" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>{t("editor.type")}</Label>
                  <Select value={quick.type} onValueChange={(type) => setQuick((q) => ({ ...q, type: type as SiteType }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{SITE_TYPES.map((x) => <SelectItem key={x} value={x}>{TYPE_LABELS[x][t.lang]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label htmlFor="q-loc">{t("import.col.place")}</Label><Input id="q-loc" value={quick.location_el} onChange={(e) => setQuick((q) => ({ ...q, location_el: e.target.value }))} placeholder="Αθηένου" /></div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="q-link">{t("import.mapLink")}</Label>
                <Input id="q-link" value={quick.link} onChange={(e) => setQuick((q) => ({ ...q, link: e.target.value, ...(e.target.value ? { lat: null, lng: null } : {}) }))} placeholder="https://maps.app.goo.gl/… / 35.06, 33.54" />
                <p className="text-xs text-muted-foreground">{t("import.mapLinkHint")}</p>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" />{quick.lat != null ? `${quick.lat}, ${quick.lng}` : t("import.noPin")}</p>
              <Button className="justify-self-start" onClick={checkQuick}><Search />{t("import.check")}</Button>
            </div>
            <LocationPicker lat={quick.lat} lng={quick.lng} type={quick.type} area={quickArea} onChange={(lat, lng) => setQuick((q) => ({ ...q, lat, lng, link: "" }))} />
          </CardContent>
        </Card>
        {quickRows && <ImportPreview rows={quickRows} defaults={defaults} onDone={() => setQuick((q) => ({ ...q, name_el: "", name_en: "", location_el: "", lat: null, lng: null, link: "" }))} />}
      </TabsContent>

      <TabsContent value="sheet" className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{t("import.tab.sheet")}</CardTitle><CardDescription>{t("import.sheetIntro")}</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={template}><Download />{t("import.template")}</Button>
              <Button asChild variant="outline" size="sm"><label className="cursor-pointer"><FileSpreadsheet />{t("import.openFile")}<input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" className="sr-only" onChange={(e) => e.target.files?.[0]?.text().then((x) => { setText(x); setSheetRows(null) })} /></label></Button>
            </div>
            <Textarea value={text} onChange={(e) => { setText(e.target.value); setSheetRows(null) }} placeholder={COLUMNS.map((c) => c.key).join("\t")} className="min-h-40 font-mono text-xs" />
            <p className="text-xs text-muted-foreground">{t("import.columnsHelp", { columns: COLUMNS.map((c) => c.key).join(", ") })}</p>
            {parsed && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>{t("import.rowsFound", { n: parsed.rows.length })}</span>
                {parsed.unknown.length > 0 && <span className="text-xs text-muted-foreground">{t("import.ignoredColumns", { columns: parsed.unknown.join(", ") })}</span>}
                <Button className="ml-auto" onClick={() => setSheetRows(parsed.rows)} disabled={!parsed.rows.length}><Search />{t("import.check")}</Button>
              </div>
            )}
          </CardContent>
        </Card>
        {sheetRows && <ImportPreview rows={sheetRows} defaults={defaults} />}
      </TabsContent>

      <TabsContent value="web" className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{t("import.tab.web")}</CardTitle><CardDescription>{t("import.webIntro")}</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {sources.length === 0 && <p className="text-sm text-muted-foreground">{t("import.noSources")}</p>}
            {sources.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <b className="text-sm">{s.label}</b>
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary">{s.url}<ExternalLink className="size-3" /></a>
                  {s.note && <span className="text-xs text-muted-foreground">{s.note}</span>}
                </span>
                <Button variant="outline" size="sm" onClick={() => fetchSource(s)} disabled={fetching}>
                  {fetchingId === s.id ? <><Loader2 className="animate-spin" />{t("import.fetching")}</> : <><Download />{t("import.fetch")}</>}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        {webRows && (
          <>
            <p className="text-sm text-muted-foreground">{t("import.fetched", { n: webRows.rows.length, source: sources.find((s) => s.id === webRows.source)?.label ?? webRows.source })}</p>
            <ImportPreview key={webRows.source} rows={webRows.rows} defaults={defaults} />
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
