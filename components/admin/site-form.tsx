"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteSiteAction, proposeAction, saveSiteAction } from "@/app/admin/actions"
import { LocationPicker } from "@/components/admin/location-picker"
import { PhotoManager, type PhotoFields, type StoredPhoto } from "@/components/admin/photo-manager"
import { VideoManager, type StoredVideo, type VideoFields } from "@/components/admin/video-manager"
import { LANGS, SITE_TYPES, slugify, TYPE_LABELS, type Lang, type SiteContent, type SiteType } from "@/lib/content"
import { completeness, mediaBonuses, PAGE_POINTS, scoreProposal, scoredMissions, SECTIONS, type MissionKey, type PointsConfig, type SectionKey } from "@/lib/completeness"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { useAdminT } from "@/components/i18n-provider"
import type { AdminT, MessageKey } from "@/lib/i18n"

export type SiteFormValues = {
  slug: string; type: SiteType; region: string; lat: number | null; lng: number | null; metropolisId: number | null
  published: boolean; coordsVerified: boolean; content: SiteContent
}

const FIELDS: { key: keyof SiteContent["el"]; label: MessageKey; rows?: number; help?: MessageKey }[] = [
  { key: "name", label: "editor.field.name" },
  { key: "location", label: "editor.field.location" },
  { key: "summary", label: "editor.field.summary", rows: 3, help: "editor.field.summaryHelp" },
  { key: "body", label: "editor.field.body", rows: 14, help: "editor.field.bodyHelp" },
  { key: "facts", label: "editor.field.facts", rows: 6, help: "editor.field.factsHelp" },
  { key: "sources", label: "editor.field.sources", rows: 4, help: "editor.field.sourcesHelp" },
]

// Which page section each text field counts towards (for the "missing" hints).
const FIELD_SECTION: Record<keyof SiteContent["el"], SectionKey> = {
  name: "identity", location: "identity", summary: "summary", body: "history", facts: "facts", sources: "sources",
}
const fieldMission = (lang: Lang, field: keyof SiteContent["el"]): MissionKey => {
  const s = SECTIONS.find((x) => x.key === FIELD_SECTION[field])!
  return s.shared ? s.key : `${s.key}.${lang}`
}

function MissingTag({ mission, done, points, t }: { mission?: MissionKey; done: Set<MissionKey>; points: PointsConfig; t: AdminT }) {
  if (!mission || done.has(mission)) return null
  const m = scoredMissions(points).find((x) => x.key === mission)!
  return <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-primary" title={m.hint[t.lang]}>{t("editor.missing", { n: m.points })}</span>
}

// Accepts "35.28, 33.88", "35.28 33.88" or a Google Maps URL containing coordinates.
const parseCoords = (text: string) => {
  const m = text.match(/(-?\d{1,2}\.\d+)\s*(?:,|%2C|\s)\s*(-?\d{1,3}\.\d+)/i)
  return m ? [Number(m[1]), Number(m[2])] as const : null
}

export function SiteForm(props: {
  mode: "direct" | "propose"
  siteId: number | null
  initial: SiteFormValues
  photos: StoredPhoto[]
  videos: StoredVideo[]
  points: PointsConfig
  regions: { id: string; name: string; active: boolean }[]
  metropolises: { id: number; name: string }[]
}) {
  const { mode, siteId } = props
  const t = useAdminT()
  const router = useRouter()
  const [v, setV] = useState(props.initial)
  const [slugTouched, setSlugTouched] = useState(!!props.initial.slug)
  const [photos, setPhotos] = useState<StoredPhoto[]>(props.photos)
  const [newPhotos, setNewPhotos] = useState<PhotoFields[]>([])
  const [videos, setVideos] = useState<StoredVideo[]>(props.videos)
  const [newVideos, setNewVideos] = useState<VideoFields[]>([])
  const cfg = props.points
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const direct = mode === "direct"

  const set = <K extends keyof SiteFormValues>(k: K, val: SiteFormValues[K]) => setV((s) => ({ ...s, [k]: val }))

  // Live completeness: as the page is now, and with these edits.
  const base = completeness({ content: props.initial.content, coordsVerified: props.initial.coordsVerified, photoCount: siteId ? props.photos.length : 0 }, cfg)
  const now = completeness({ content: v.content, coordsVerified: v.coordsVerified, photoCount: photos.length + newPhotos.length }, cfg)
  const movedPin = v.lat !== props.initial.lat || v.lng !== props.initial.lng
  // A moved pin earns the location points if the reviewer verifies it.
  const after = !direct && movedPin && !v.coordsVerified ? new Set([...now.done, "location" as const]) : now.done
  const earn = scoreProposal(cfg, base.done, after, mediaBonuses(siteId ? props.photos.length : 0, newPhotos, newVideos)).points
  const locationPoints = cfg.sections.location * 2
  const setText = (lang: Lang, key: keyof SiteContent["el"], val: string) => setV((s) => {
    const content = { ...s.content, [lang]: { ...s.content[lang], [key]: val } }
    const slug = !slugTouched && lang === "en" && key === "name" && direct ? slugify(val) : s.slug
    return { ...s, content, slug }
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      if (direct) {
        const r = await saveSiteAction(siteId, v)
        if (!r.ok) return void toast.error(r.error)
        toast.success(t("editor.saved"))
        if (!siteId) router.push(`/admin/sites/${r.id}`)
        else router.refresh()
      } else {
        const r = await proposeAction(siteId, v, newPhotos, newVideos, note)
        if (!r.ok) return void toast.error(r.error)
        toast.success(t("editor.proposalSent"))
        router.push(`/admin/submissions/${r.id}`)
      }
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
      <Card className="border-gold/40 py-4 lg:col-span-2">
        <CardContent className="grid gap-2 px-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
          <div className="grid gap-1.5">
            <p className="text-sm">
              {t("editor.completeness")}: <b>{base.percent}%</b>
              {now.percent !== base.percent && <> → <b className="text-primary">{now.percent}%</b></>}
              <span className="text-muted-foreground"> · {t("editor.byLang", { el: now.byLang.el, en: now.byLang.en, max: PAGE_POINTS })}</span>
              {now.missing.length > 0 && <span className="text-muted-foreground"> · {t("editor.missingList", { list: now.missing.map((m) => m.label[t.lang]).join(", ") })}</span>}
            </p>
            <ProgressBar percent={now.percent} />
          </div>
          {!direct && (
            <p className="text-sm whitespace-nowrap">{t("editor.earnBefore")} <b className="font-heading text-xl text-primary">+{earn}</b> {t("editor.earnAfter")}</p>
          )}
        </CardContent>
      </Card>
      <div className="grid content-start gap-6">
        <Card>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("editor.type")}</Label>
                <Select value={v.type} onValueChange={(type) => set("type", type as SiteType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{SITE_TYPES.map((type) => <SelectItem key={type} value={type}>{TYPE_LABELS[type].el} / {TYPE_LABELS[type].en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("editor.region")}</Label>
                <Select value={v.region} onValueChange={(r) => set("region", r)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{props.regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.active ? r.name : t("editor.regionInactive", { name: r.name })}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>{t("editor.metropolis")}</Label>
                <Select value={String(v.metropolisId ?? "none")} onValueChange={(m) => set("metropolisId", m === "none" ? null : Number(m))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("editor.metropolisNone")}</SelectItem>
                    {props.metropolises.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {direct && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="slug">{t("editor.slug")}</Label>
                  <Input id="slug" value={v.slug} pattern="[a-z0-9-]+" placeholder={t("editor.slugPlaceholder")}
                    onChange={(e) => { setSlugTouched(true); set("slug", e.target.value) }} />
                  <p className="text-xs text-muted-foreground">/site/<b>{v.slug || "…"}</b> · {t("editor.slugHelp")}</p>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.published} onCheckedChange={(c) => set("published", !!c)} />{t("editor.published")}</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.coordsVerified} onCheckedChange={(c) => set("coordsVerified", !!c)} />{t("editor.verifiedLocation")}</label>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Tabs defaultValue="el">
              <TabsList>
                <TabsTrigger value="el">Ελληνικά</TabsTrigger>
                <TabsTrigger value="en">English</TabsTrigger>
              </TabsList>
              {LANGS.map((lang) => (
                <TabsContent key={lang} value={lang} className="mt-4 grid gap-4">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="grid gap-1.5">
                      <Label htmlFor={`${lang}-${f.key}`}>{t(f.label)}<MissingTag mission={fieldMission(lang, f.key)} done={now.done} points={cfg} t={t} /></Label>
                      {f.rows ? (
                        <Textarea id={`${lang}-${f.key}`} rows={f.rows} value={v.content[lang][f.key]} onChange={(e) => setText(lang, f.key, e.target.value)}
                          className={f.key === "body" ? "max-h-[60vh] min-h-64 overflow-y-auto leading-relaxed" : "max-h-72 overflow-y-auto"} />
                      ) : (
                        <Input id={`${lang}-${f.key}`} value={v.content[lang][f.key]} onChange={(e) => setText(lang, f.key, e.target.value)} />
                      )}
                      {f.help && <p className="text-xs text-muted-foreground">{t(f.help)}</p>}
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {!direct && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">{t("editor.note")}</CardTitle>
              <CardDescription>{t("editor.noteHelp")}</CardDescription>
            </CardHeader>
            <CardContent><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></CardContent>
          </Card>
        )}
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{t("editor.mapLocation")}<MissingTag mission="location" done={now.done} points={cfg} t={t} /></CardTitle>
            {!direct && !v.coordsVerified && <p className="text-xs text-muted-foreground">{t("editor.moveThePin", { n: locationPoints })}</p>}
          </CardHeader>
          <CardContent className="grid gap-3">
            <LocationPicker lat={v.lat} lng={v.lng} type={v.type} onChange={(lat, lng) => setV((s) => ({ ...s, lat, lng }))} />
            <p className="text-xs text-muted-foreground">{t("editor.mapHelp")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lat">Lat</Label>
                <Input id="lat" inputMode="decimal" required value={v.lat ?? ""}
                  onPaste={(e) => { const c = parseCoords(e.clipboardData.getData("text")); if (c) { e.preventDefault(); setV((s) => ({ ...s, lat: c[0], lng: c[1] })) } }}
                  onChange={(e) => set("lat", e.target.value === "" ? null : Number(e.target.value))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lng">Lng</Label>
                <Input id="lng" inputMode="decimal" required value={v.lng ?? ""} onChange={(e) => set("lng", e.target.value === "" ? null : Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{t("editor.photos")}<MissingTag mission="photo" done={now.done} points={cfg} t={t} /></CardTitle>
            {!direct && (
              <p className="text-xs text-muted-foreground">
                {t("editor.photoBonus", { extra: cfg.bonuses.extra_photo, historic: cfg.bonuses.historic_photo })}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {direct && !siteId ? (
              <p className="text-sm text-muted-foreground">{t("editor.saveFirstPhotos")}</p>
            ) : direct ? (
              <PhotoManager mode="direct" siteId={siteId!} photos={photos} onChange={setPhotos} />
            ) : (
              <PhotoManager mode="propose" existing={photos} photos={newPhotos} onChange={setNewPhotos} historicPoints={cfg.bonuses.historic_photo} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{t("editor.videos")}</CardTitle>
            {!direct && <p className="text-xs text-muted-foreground">{t("editor.videoBonus", { n: cfg.bonuses.video })}</p>}
          </CardHeader>
          <CardContent>
            {direct && !siteId ? (
              <p className="text-sm text-muted-foreground">{t("editor.saveFirstVideos")}</p>
            ) : direct ? (
              <VideoManager mode="direct" siteId={siteId!} videos={videos} onChange={setVideos} />
            ) : (
              <VideoManager mode="propose" existing={videos} videos={newVideos} onChange={setNewVideos} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur lg:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : !direct && <Send />}
          {direct ? t(siteId ? "editor.save" : "editor.create") : t("editor.sendProposal")}
        </Button>
        <Button type="button" variant="ghost" asChild><Link href="/admin/sites">{t("editor.cancel")}</Link></Button>
        {siteId && v.slug && (
          <Button type="button" variant="outline" asChild className="ml-auto">
            <Link href={`/site/${v.slug}`} target="_blank">{t("editor.viewPage")}<ExternalLink /></Link>
          </Button>
        )}
        {direct && siteId && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="destructive"><Trash2 />{t("editor.delete")}</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("editor.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("editor.deleteText")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("editor.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => start(async () => {
                  const r = await deleteSiteAction(siteId)
                  if (!r.ok) return void toast.error(r.error)
                  toast.success(t("editor.deleted"))
                  router.push("/admin/sites")
                })}>{t("editor.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  )
}
