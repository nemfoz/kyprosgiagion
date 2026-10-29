"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { Map as MlMap, Marker, StyleSpecification } from "maplibre-gl"
import { PIXEL_RATIO } from "@/components/map/terrain"
import { cn } from "@/lib/utils"

// The home page's globe: Orthodox countries bright, the rest muted, the occupied areas of Cyprus in crimson, and a
// marker for each Church (edition) — open editions lead to their page. Colours are shades of the site palette.
const C = {
  sea: "#e4dccb", land: "#d2c6ae", orthodox: "#fbf9f4", edition: "#f3e6c8", border: "#b9ab8f", orthodoxBorder: "#ad8840",
  crimson: "#6b1d1d", space: "#ece8de",
}

export type WorldEdition = { id: string; name: string; church: string; active: boolean; churches: number; href: string; churchesLabel: string }

function style(): StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    sources: {
      world: { type: "geojson", data: "/data/world.geojson", attribution: "Natural Earth" },
      occupied: { type: "geojson", data: "/data/occupied.geojson", attribution: "© OpenStreetMap contributors" },
    },
    layers: [
      { id: "sea", type: "background", paint: { "background-color": C.sea } },
      {
        id: "land", type: "fill", source: "world",
        paint: { "fill-color": ["case", ["get", "orthodox"], C.orthodox, ["has", "edition"], C.edition, C.land] },
      },
      { id: "borders", type: "line", source: "world", paint: { "line-color": C.border, "line-width": 0.5 } },
      { id: "orthodox-line", type: "line", source: "world", filter: ["==", ["get", "orthodox"], true], paint: { "line-color": C.orthodoxBorder, "line-width": 0.9, "line-opacity": 0.8 } },
      { id: "occupied", type: "fill", source: "occupied", paint: { "fill-color": C.crimson, "fill-opacity": 0.75 } },
    ],
    sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 4, 0] },
  }
}

export function WorldMap({ editions, className, center = [30, 38], zoom = 1.9, spin = true, labels, narrow }: {
  editions: WorldEdition[]; className?: string; center?: [number, number]; zoom?: number; spin?: boolean
  /** Centre and zoom for narrow screens (phones), when they differ. */
  narrow?: { center: [number, number]; zoom: number }
  /** "Coming soon" in the page's language. */
  labels: { soon: string }
}) {
  const el = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const props = useRef({ editions, labels, router })
  useEffect(() => { props.current = { editions, labels, router } })

  useEffect(() => {
    let map: MlMap | undefined
    let cancelled = false
    let frame = 0
    const markers: Marker[] = []
    import("maplibre-gl").then(async (ml) => {
      if (cancelled || !el.current) return
      const touch = matchMedia("(pointer: coarse)").matches
      const view = narrow && el.current.clientWidth < 640 ? narrow : { center, zoom }
      map = new ml.Map({
        container: el.current, style: style(), ...view, minZoom: 1, maxZoom: 5,
        attributionControl: { compact: true }, pixelRatio: PIXEL_RATIO(),
        scrollZoom: false, dragPan: !touch, dragRotate: false, touchZoomRotate: false, doubleClickZoom: false, keyboard: false,
      })
      const points: Record<string, { lng: number; lat: number }> = (await fetch("/data/world.geojson").then((r) => r.json()).catch(() => ({}))).editions ?? {}
      if (cancelled || !map) return
      for (const e of props.current.editions) {
        const p = points[e.id]
        if (!p) continue
        const node = document.createElement("button")
        node.type = "button"
        node.className = cn("group flex items-center gap-1.5 rounded-full text-left outline-none", e.active ? "cursor-pointer" : "cursor-default")
        node.setAttribute("aria-label", `${e.name} — ${e.active ? e.churchesLabel : props.current.labels.soon}`)
        node.innerHTML = e.active
          ? `<span class="relative grid size-4 place-items-center"><span class="absolute inset-0 animate-ping rounded-full bg-[#6b1d1d]/40"></span><span class="size-3 rounded-full border-2 border-[#fbf9f4] bg-[#6b1d1d] shadow"></span></span><span class="rounded-full bg-[#6b1d1d] px-2.5 py-1 text-[12px] font-semibold text-[#fbf9f4] shadow-md">${e.name} · ${e.churchesLabel}</span>`
          : `<span class="size-2.5 rounded-full border-2 border-[#ad8840] bg-[#fbf9f4]"></span><span class="rounded-full bg-[#fbf9f4]/90 px-2 py-0.5 text-[11px] text-[#553f3b] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">${e.name} · ${props.current.labels.soon}</span>`
        if (e.active) node.addEventListener("click", () => props.current.router.push(e.href))
        markers.push(new ml.Marker({ element: node, anchor: "left", offset: [-8, 0] }).setLngLat([p.lng, p.lat]).addTo(map))
      }
      // A slow turn of the globe until someone touches it (not with reduced motion).
      if (spin && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        let stopped = false
        const stop = () => { stopped = true }
        map.on("mousedown", stop); map.on("touchstart", stop)
        const turn = () => {
          if (stopped || !map) return
          const c = map.getCenter()
          map.setCenter([c.lng + 0.03, c.lat])
          frame = requestAnimationFrame(turn)
        }
        map.once("load", () => { frame = requestAnimationFrame(turn) })
      }
    })
    return () => { cancelled = true; cancelAnimationFrame(frame); markers.forEach((m) => m.remove()); map?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once
  }, [])

  return <div ref={el} className={cn("relative overflow-hidden", className)} />
}
