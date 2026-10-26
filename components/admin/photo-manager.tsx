"use client"

import { useRef, useState } from "react"
import { ArrowDown, ArrowUp, ImagePlus, Link2, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deletePhotoAction, importPhotoAction, reorderPhotosAction, updatePhotoAction } from "@/app/admin/actions"
import { uploadPhoto } from "@/lib/image-client"
import { cn } from "@/lib/utils"

export type PhotoFields = { src: string; captionEl: string; captionEn: string; credit: string; sourceUrl: string }
export type StoredPhoto = PhotoFields & { id: number }

type Props =
  | { mode: "direct"; siteId: number; photos: StoredPhoto[]; onChange: (p: StoredPhoto[]) => void }
  | { mode: "propose"; existing: StoredPhoto[]; photos: PhotoFields[]; onChange: (p: PhotoFields[]) => void }

/**
 * Admins (direct): changes are saved immediately.
 * Users (propose): new photos are uploaded and kept with the proposal until an admin approves it.
 */
export function PhotoManager(props: Props) {
  const [busy, setBusy] = useState(false)
  const [credit, setCredit] = useState("")
  const [url, setUrl] = useState("")
  const [over, setOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const photos = props.photos as (PhotoFields & { id?: number })[]
  const direct = props.mode === "direct"

  const set = (list: (PhotoFields & { id?: number })[]) => (props.onChange as (p: typeof list) => void)(list)

  async function upload(files: File[]) {
    setBusy(true)
    let list = [...photos]
    for (const file of files) {
      try {
        const data = await uploadPhoto(file, { siteId: direct ? props.siteId : undefined, credit })
        list = [...list, direct ? data.photo : data.pending]
        set(list)
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`)
      }
    }
    setBusy(false)
  }

  async function importUrl() {
    if (!url.trim()) return
    setBusy(true)
    const r = await importPhotoAction(url.trim(), direct ? props.siteId : null, credit)
    setBusy(false)
    if (!r.ok) return toast.error(r.error)
    set([...photos, (direct ? r.photo : r.pending) as PhotoFields])
    setUrl("")
    toast.success("Η φωτογραφία αντιγράφηκε στον χώρο αποθήκευσης")
  }

  async function edit(i: number, field: keyof PhotoFields, value: string) {
    const list = photos.map((p, n) => (n === i ? { ...p, [field]: value } : p))
    set(list)
  }

  async function persist(i: number) {
    const p = photos[i]
    if (!direct || p.id == null) return
    const r = await updatePhotoAction(p.id, { captionEl: p.captionEl, captionEn: p.captionEn, credit: p.credit, sourceUrl: p.sourceUrl })
    if (!r.ok) toast.error(r.error)
  }

  async function move(i: number, d: number) {
    const list = [...photos];
    [list[i], list[i + d]] = [list[i + d], list[i]]
    set(list)
    if (direct) {
      const r = await reorderPhotosAction(props.siteId, list.map((p) => p.id!))
      if (!r.ok) toast.error(r.error)
    }
  }

  async function remove(i: number) {
    const p = photos[i]
    if (direct && p.id != null) {
      const r = await deletePhotoAction(p.id)
      if (!r.ok) return toast.error(r.error)
    }
    set(photos.filter((_, n) => n !== i))
  }

  return (
    <div className="grid gap-3">
      {props.mode === "propose" && props.existing.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-sm text-muted-foreground">Υπάρχουσες φωτογραφίες</p>
          <div className="flex flex-wrap gap-2">
            {props.existing.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.src} alt="" className="size-16 rounded-md border object-cover" />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Νέες φωτογραφίες για την πρόταση</p>
        </div>
      )}

      {photos.map((p, i) => (
        <div key={(p.id ?? p.src) + String(i)} className="grid grid-cols-[96px_1fr] gap-3 rounded-lg border bg-background p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt="" className="size-24 rounded-md object-cover" />
          <div className="grid gap-1.5">
            <Input value={p.captionEl} onChange={(e) => edit(i, "captionEl", e.target.value)} onBlur={() => persist(i)} placeholder="Λεζάντα (ΕΛ)" className="h-8 text-sm" />
            <Input value={p.captionEn} onChange={(e) => edit(i, "captionEn", e.target.value)} onBlur={() => persist(i)} placeholder="Caption (EN)" className="h-8 text-sm" />
            <Input value={p.credit} onChange={(e) => edit(i, "credit", e.target.value)} onBlur={() => persist(i)} placeholder="Φωτογράφος / ©" className="h-8 text-sm" />
            <Input value={p.sourceUrl} onChange={(e) => edit(i, "sourceUrl", e.target.value)} onBlur={() => persist(i)} placeholder="Σύνδεσμος πηγής (https://…)" className="h-8 text-sm" />
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Πάνω"><ArrowUp /></Button>
              <Button type="button" variant="outline" size="icon-sm" disabled={i === photos.length - 1} onClick={() => move(i, 1)} aria-label="Κάτω"><ArrowDown /></Button>
              {i === 0 && <span className="ml-1 text-xs text-muted-foreground">Κύρια φωτογραφία</span>}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" className="ml-auto"><Trash2 />Διαγραφή</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Διαγραφή φωτογραφίας;</AlertDialogTitle>
                    <AlertDialogDescription>{direct ? "Η φωτογραφία θα αφαιρεθεί οριστικά από τη σελίδα." : "Η φωτογραφία θα αφαιρεθεί από την πρόταση."}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Άκυρο</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(i)}>Διαγραφή</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}

      <div className="grid gap-1.5">
        <Label htmlFor="photo-credit">Φωτογράφος για τις νέες φωτογραφίες</Label>
        <Input id="photo-credit" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="π.χ. Γιώργος Κωνσταντίνου, 2016" />
      </div>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload([...e.dataTransfer.files]) }}
        className={cn("flex flex-col items-center gap-1 rounded-lg border-2 border-dashed p-5 text-sm text-muted-foreground transition hover:border-primary/50", over && "border-primary bg-accent")}
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        Σύρετε φωτογραφίες εδώ ή <span className="text-primary underline">επιλέξτε αρχεία</span>
      </button>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload([...(e.target.files ?? [])])} />
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ή διεύθυνση εικόνας από άλλη ιστοσελίδα (https://…)" />
        <Button type="button" variant="outline" onClick={importUrl} disabled={busy}><Link2 />Αντιγραφή</Button>
      </div>
      <p className="text-xs text-muted-foreground">Οι εικόνες από άλλες ιστοσελίδες αντιγράφονται στον δικό μας χώρο — δεν φορτώνονται από τον ξένο ιστότοπο. Συμπληρώστε τον σύνδεσμο πηγής για να εμφανίζεται στη σελίδα.</p>
    </div>
  )
}
