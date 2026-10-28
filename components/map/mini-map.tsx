"use client"

import { useEffect, useRef } from "react"
import type { Lang } from "@/lib/content"
import { useT } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import type { SiteType } from "@/lib/content"
import { addSiteLayers, ButtonsControl, collapseAttribution, mapStyle, PIXEL_RATIO, setRegion, setSatellite, setSitePoints, setTerrain } from "./terrain"

/** 3D satellite map of one site, for its dedicated page. Starts only when it scrolls near the screen. */
export function MiniMap({ lat, lng, type, boundary, lang, className }: {
  lat: number; lng: number; type: string; boundary?: string; lang: Lang; className?: string
}) {
  const t = useT()
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("maplibre-gl").Map | null>(null)

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined
    let cancelled = false
    const start = () => import("maplibre-gl").then((ml) => {
      if (cancelled || !el.current) return
      map = new ml.Map({
        container: el.current, style: mapStyle(), center: [lng, lat], zoom: 13.2, pitch: 58, bearing: -20,
        maxPitch: 65, cooperativeGestures: true, attributionControl: { compact: true }, pixelRatio: PIXEL_RATIO(),
      })
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right")
      let satellite = true
      map.addControl(new ButtonsControl([{
        label: () => t(satellite ? "map" : "satellite", lang),
        onClick: () => { satellite = !satellite; setSatellite(map!, satellite) },
      }]), "top-left")
      map.on("load", () => {
        collapseAttribution(map!)
        setTerrain(map!, true, 1.5)
        setSatellite(map!, satellite)
        if (boundary) setRegion(map!, boundary)
        addSiteLayers(map!)
        setSitePoints(map!, [{ id: 0, type: type as SiteType, lng, lat, approx: false }], null)
      })
      mapRef.current = map
    })
    const seen = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      seen.disconnect()
      start()
    }, { rootMargin: "400px" })
    if (el.current) seen.observe(el.current)
    return () => { cancelled = true; seen.disconnect(); map?.remove() }
  }, [lat, lng, type, boundary, lang, t])

  return <div ref={el} className={cn("h-64 overflow-hidden rounded-lg bg-muted", className)} />
}
