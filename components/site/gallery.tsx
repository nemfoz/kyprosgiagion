"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { sized } from "@/lib/photo-sizes.mjs"

type Photo = { src: string; caption: string; credit: string; sourceUrl: string; historic: boolean }

const domain = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url } }

/** Photo source, always shown as a visible link. */
function Credit({ p, sourceLabel, dark = false }: { p: Photo; sourceLabel: string; dark?: boolean }) {
  if (!p.credit && !p.sourceUrl) return null
  return (
    <span className={dark ? "text-parchment/75" : "text-muted-foreground"}>
      {p.credit && <>© {p.credit}</>}
      {p.credit && p.sourceUrl && " · "}
      {p.sourceUrl && (
        <a href={p.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-2">
          {sourceLabel}: {domain(p.sourceUrl)}
        </a>
      )}
    </span>
  )
}

export function Gallery({ photos, alt, sourceLabel, historicLabel }: { photos: Photo[]; alt: string; sourceLabel: string; historicLabel: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const go = (d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length))
  const p = open !== null ? photos[open] : null

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {photos.map((ph, i) => (
          <figure key={i}>
            <button type="button" onClick={() => setOpen(i)} className="group block w-full cursor-zoom-in overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(ph.src, "md")} alt={ph.caption || alt} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" />
            </button>
            {(ph.caption || ph.credit || ph.sourceUrl || ph.historic) && (
              <figcaption className="mt-1.5 text-[13px] leading-snug">
                {ph.historic && <span className="block text-xs font-semibold tracking-wide text-gold-deep uppercase">{historicLabel}</span>}
                {ph.caption && <span className="block">{ph.caption}</span>}
                <Credit p={ph} sourceLabel={sourceLabel} />
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent
          className="max-w-[min(96vw,1400px)] border-0 bg-foreground/95 p-4 text-parchment sm:max-w-[min(96vw,1400px)]"
          onKeyDown={(e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1) }}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {p && (
            <figure className="grid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.caption || alt} className="mx-auto max-h-[80vh] object-contain" />
              <figcaption className="text-center text-sm">
                {p.caption && <span className="block">{p.caption}</span>}
                <Credit p={p} sourceLabel={sourceLabel} dark /> <span className="text-parchment/50">· {open! + 1} / {photos.length}</span>
              </figcaption>
            </figure>
          )}
          {photos.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-parchment/10 hover:bg-parchment/20"><ChevronLeft /></button>
              <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-parchment/10 hover:bg-parchment/20"><ChevronRight /></button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
