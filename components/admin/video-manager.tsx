"use client"

import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addVideoAction, deleteVideoAction, updateVideoAction } from "@/app/admin/actions"
import { youtubeId } from "@/lib/content"

export type VideoFields = { youtubeId: string; titleEl: string; titleEn: string }
export type StoredVideo = VideoFields & { id: number }

type Props =
  | { mode: "direct"; siteId: number; videos: StoredVideo[]; onChange: (v: StoredVideo[]) => void }
  | { mode: "propose"; existing: StoredVideo[]; videos: VideoFields[]; onChange: (v: VideoFields[]) => void }

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

/** YouTube links: pasted, shown as a thumbnail with titles, embedded on the church page. */
export function VideoManager(props: Props) {
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const direct = props.mode === "direct"
  const videos = props.videos as (VideoFields & { id?: number })[]
  const set = (list: typeof videos) => (props.onChange as (v: typeof list) => void)(list)

  async function add(text = url) {
    const id = youtubeId(text)
    if (!id) return void toast.error("Δεν αναγνωρίστηκε σύνδεσμος YouTube.")
    if ([...videos, ...(direct ? [] : props.existing)].some((v) => v.youtubeId === id)) return void toast.error("Το βίντεο υπάρχει ήδη.")
    if (direct) {
      setBusy(true)
      const r = await addVideoAction(props.siteId, text)
      setBusy(false)
      if (!r.ok) return void toast.error(r.error)
      set([...videos, r.video])
    } else {
      set([...videos, { youtubeId: id, titleEl: "", titleEn: "" }])
    }
    setUrl("")
  }

  const edit = (i: number, field: "titleEl" | "titleEn", value: string) => set(videos.map((v, n) => (n === i ? { ...v, [field]: value } : v)))

  async function persist(i: number) {
    const v = videos[i]
    if (!direct || v.id == null) return
    const r = await updateVideoAction(v.id, { titleEl: v.titleEl, titleEn: v.titleEn })
    if (!r.ok) toast.error(r.error)
  }

  async function remove(i: number) {
    const v = videos[i]
    if (direct && v.id != null) {
      const r = await deleteVideoAction(v.id)
      if (!r.ok) return void toast.error(r.error)
    }
    set(videos.filter((_, n) => n !== i))
  }

  return (
    <div className="grid gap-3">
      {props.mode === "propose" && props.existing.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-sm text-muted-foreground">Υπάρχοντα βίντεο</p>
          <div className="flex flex-wrap gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {props.existing.map((v) => <img key={v.id} src={thumb(v.youtubeId)} alt="" className="h-16 rounded-md border object-cover" />)}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Νέα βίντεο για την πρόταση</p>
        </div>
      )}

      {videos.map((v, i) => (
        <div key={v.youtubeId} className="grid grid-cols-[128px_1fr] gap-3 rounded-lg border bg-background p-2.5">
          <a href={`https://www.youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(v.youtubeId)} alt="" className="aspect-video w-32 rounded-md object-cover" />
          </a>
          <div className="grid gap-1.5">
            <Input value={v.titleEl} onChange={(e) => edit(i, "titleEl", e.target.value)} onBlur={() => persist(i)} placeholder="Τίτλος (ΕΛ)" className="h-8 text-sm" />
            <Input value={v.titleEn} onChange={(e) => edit(i, "titleEn", e.target.value)} onBlur={() => persist(i)} placeholder="Title (EN)" className="h-8 text-sm" />
            <Button type="button" variant="destructive" size="sm" className="justify-self-end" onClick={() => remove(i)}><Trash2 />Αφαίρεση</Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Σύνδεσμος YouTube (https://youtu.be/…)"
          onPaste={(e) => { const text = e.clipboardData.getData("text"); if (youtubeId(text)) { e.preventDefault(); add(text) } }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
        <Button type="button" variant="outline" onClick={() => add()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}Προσθήκη</Button>
      </div>
      <p className="text-xs text-muted-foreground">Επικολλήστε έναν σύνδεσμο YouTube· το βίντεο ενσωματώνεται στη σελίδα του ναού. Ένας σύνδεσμος YouTube μόνος του σε μια παράγραφο του κειμένου ενσωματώνεται επίσης.</p>
    </div>
  )
}
