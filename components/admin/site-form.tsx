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
import { LANGS, SITE_TYPES, slugify, TYPE_LABELS, type Lang, type SiteContent, type SiteType } from "@/lib/content"

export type SiteFormValues = {
  slug: string; type: SiteType; region: string; lat: number | null; lng: number | null
  published: boolean; coordsVerified: boolean; content: SiteContent
}

const FIELDS: { key: keyof SiteContent["el"]; label: string; rows?: number; help?: string }[] = [
  { key: "name", label: "Όνομα" },
  { key: "location", label: "Τοποθεσία (χωριό, επαρχία)" },
  { key: "summary", label: "Σύντομη περιγραφή", rows: 3, help: "Εμφανίζεται στον χάρτη και στην αρχή της σελίδας." },
  { key: "body", label: "Κείμενο / Ιστορία", rows: 14, help: "Κενή γραμμή = νέα παράγραφος · ## Επικεφαλίδα · **έντονα** · *πλάγια* · [κείμενο](https://…) · - λίστα" },
  { key: "facts", label: "Στοιχεία (ένα ανά γραμμή)", rows: 6, help: "Μορφή «Ετικέτα: Τιμή», π.χ. «Χρονολόγηση: 12ος αιώνας»" },
  { key: "sources", label: "Πηγές (μία ανά γραμμή)", rows: 4, help: "Σύνδεσμοι ως [κείμενο](https://…) — στη σελίδα φαίνεται πάντα και ο ιστότοπος προορισμού." },
]

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
  regions: { id: string; name: string; active: boolean }[]
}) {
  const { mode, siteId } = props
  const router = useRouter()
  const [v, setV] = useState(props.initial)
  const [slugTouched, setSlugTouched] = useState(!!props.initial.slug)
  const [photos, setPhotos] = useState<StoredPhoto[]>(props.photos)
  const [newPhotos, setNewPhotos] = useState<PhotoFields[]>([])
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const direct = mode === "direct"

  const set = <K extends keyof SiteFormValues>(k: K, val: SiteFormValues[K]) => setV((s) => ({ ...s, [k]: val }))
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
        toast.success("Αποθηκεύτηκε")
        if (!siteId) router.push(`/admin/sites/${r.id}`)
        else router.refresh()
      } else {
        const r = await proposeAction(siteId, v, newPhotos, note)
        if (!r.ok) return void toast.error(r.error)
        toast.success("Η πρόταση στάλθηκε για έγκριση")
        router.push(`/admin/submissions/${r.id}`)
      }
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="grid content-start gap-6">
        <Card>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Τύπος</Label>
                <Select value={v.type} onValueChange={(t) => set("type", t as SiteType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{SITE_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t].el} / {TYPE_LABELS[t].en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Περιοχή</Label>
                <Select value={v.region} onValueChange={(r) => set("region", r)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{props.regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}{r.active ? "" : " (ανενεργή)"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {direct && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="slug">Διεύθυνση σελίδας (slug)</Label>
                  <Input id="slug" value={v.slug} pattern="[a-z0-9-]+" placeholder="π.χ. panagia-theotokos-trikomo"
                    onChange={(e) => { setSlugTouched(true); set("slug", e.target.value) }} />
                  <p className="text-xs text-muted-foreground">/site/<b>{v.slug || "…"}</b> · λατινικοί χαρακτήρες, αριθμοί και παύλες</p>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.published} onCheckedChange={(c) => set("published", !!c)} />Δημοσιευμένο</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.coordsVerified} onCheckedChange={(c) => set("coordsVerified", !!c)} />Επαληθευμένη θέση</label>
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
                      <Label htmlFor={`${lang}-${f.key}`}>{f.label}</Label>
                      {f.rows ? (
                        <Textarea id={`${lang}-${f.key}`} rows={f.rows} value={v.content[lang][f.key]} onChange={(e) => setText(lang, f.key, e.target.value)}
                          className={f.key === "body" ? "max-h-[60vh] min-h-64 overflow-y-auto leading-relaxed" : "max-h-72 overflow-y-auto"} />
                      ) : (
                        <Input id={`${lang}-${f.key}`} value={v.content[lang][f.key]} onChange={(e) => setText(lang, f.key, e.target.value)} />
                      )}
                      {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
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
              <CardTitle className="font-heading text-lg">Σημείωμα προς τους διαχειριστές</CardTitle>
              <CardDescription>Τι αλλάξατε και από πού προέρχονται οι πληροφορίες (προαιρετικό).</CardDescription>
            </CardHeader>
            <CardContent><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></CardContent>
          </Card>
        )}
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Θέση στον χάρτη</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <LocationPicker lat={v.lat} lng={v.lng} type={v.type} onChange={(lat, lng) => setV((s) => ({ ...s, lat, lng }))} />
            <p className="text-xs text-muted-foreground">Κάντε κλικ στον χάρτη ή σύρετε το σημάδι. Μπορείτε να επικολλήσετε συντεταγμένες ή σύνδεσμο Google Maps στο πεδίο Lat.</p>
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
          <CardHeader><CardTitle className="font-heading text-lg">Φωτογραφίες</CardTitle></CardHeader>
          <CardContent>
            {direct && !siteId ? (
              <p className="text-sm text-muted-foreground">Αποθηκεύστε πρώτα την καταχώρηση για να προσθέσετε φωτογραφίες.</p>
            ) : direct ? (
              <PhotoManager mode="direct" siteId={siteId!} photos={photos} onChange={setPhotos} />
            ) : (
              <PhotoManager mode="propose" existing={photos} photos={newPhotos} onChange={setNewPhotos} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur lg:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : !direct && <Send />}
          {direct ? (siteId ? "Αποθήκευση" : "Δημιουργία") : "Αποστολή πρότασης"}
        </Button>
        <Button type="button" variant="ghost" asChild><Link href="/admin/sites">Άκυρο</Link></Button>
        {siteId && v.slug && (
          <Button type="button" variant="outline" asChild className="ml-auto">
            <Link href={`/site/${v.slug}`} target="_blank">Προβολή σελίδας<ExternalLink /></Link>
          </Button>
        )}
        {direct && siteId && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="destructive"><Trash2 />Διαγραφή</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Οριστική διαγραφή;</AlertDialogTitle>
                <AlertDialogDescription>Η καταχώρηση και όλες οι φωτογραφίες της θα διαγραφούν. Δεν αναιρείται.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Άκυρο</AlertDialogCancel>
                <AlertDialogAction onClick={() => start(async () => {
                  const r = await deleteSiteAction(siteId)
                  if (!r.ok) return void toast.error(r.error)
                  toast.success("Διαγράφηκε")
                  router.push("/admin/sites")
                })}>Διαγραφή</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  )
}
