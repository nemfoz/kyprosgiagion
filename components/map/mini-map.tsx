"use client"

import { useEffect, useRef } from "react"
import type { Lang } from "@/lib/content"
import { UI } from "@/lib/i18n"
import { ButtonsControl, collapseAttribution, mapStyle, pinElement, setRegion, setSatellite, setTerrain } from "./terrain"

/** Small 3D satellite map of one site, for its dedicated page. */
export function MiniMap({ lat, lng, type, boundary, lang }: { lat: number; lng: number; type: string; boundary?: string; lang: Lang }) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("maplibre-gl").Map | null>(null)

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined
    let cancelled = false
    import("maplibre-gl").then((ml) => {
      if (cancelled || !el.current) return
      map = new ml.Map({
        container: el.current, style: mapStyle(), center: [lng, lat], zoom: 13.2, pitch: 58, bearing: -20,
        maxPitch: 75, cooperativeGestures: true, attributionControl: { compact: true },
      })
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right")
      let satellite = true
      map.addControl(new ButtonsControl([{
        label: () => (satellite ? UI.map : UI.satellite)[lang],
        onClick: () => { satellite = !satellite; setSatellite(map!, satellite) },
      }]), "top-left")
      map.on("load", () => {
        collapseAttribution(map!)
        setTerrain(map!, true, 1.5)
        setSatellite(map!, satellite)
        if (boundary) setRegion(map!, boundary)
      })
      mapRef.current = map
      new ml.Marker({ element: pinElement(type), anchor: "bottom", offset: [0, -6] }).setLngLat([lng, lat]).addTo(map)
    })
    return () => { cancelled = true; map?.remove() }
  }, [lat, lng, type, boundary, lang])

  return <div ref={el} className="h-64 overflow-hidden rounded-lg bg-muted" />
}
