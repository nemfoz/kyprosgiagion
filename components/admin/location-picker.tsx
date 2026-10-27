"use client"

import { useEffect, useRef, useState } from "react"
import type { Map as MlMap, Marker } from "maplibre-gl"
import { applyMapTheme, ButtonsControl, collapseAttribution, mapStyle, pinElement, setRegion, setSatellite } from "@/components/map/terrain"
import { useTheme } from "next-themes"

/** Satellite map for placing a church precisely: click or drag the pin. */
export function LocationPicker({ lat, lng, type, onChange }: {
  lat: number | null; lng: number | null; type: string; onChange: (lat: number, lng: number) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const ml = useRef<typeof import("maplibre-gl") | null>(null)
  const [loaded, setLoaded] = useState(false)
  const { resolvedTheme } = useTheme()
  const changeRef = useRef(onChange)
  useEffect(() => { changeRef.current = onChange })

  useEffect(() => {
    let cancelled = false
    import("maplibre-gl").then((lib) => {
      if (cancelled || !el.current) return
      ml.current = lib
      const has = lat != null && lng != null
      const m = new lib.Map({
        container: el.current, style: mapStyle(),
        center: has ? [lng!, lat!] : [34.0, 35.35], zoom: has ? 15 : 8.4, attributionControl: { compact: true },
      })
      map.current = m
      m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right")
      let satellite = true
      m.addControl(new ButtonsControl([{ label: () => (satellite ? "Χάρτης" : "Δορυφόρος"), onClick: () => { satellite = !satellite; setSatellite(m, satellite) } }]), "top-left")
      m.getCanvas().style.cursor = "crosshair"
      m.on("load", () => { collapseAttribution(m); setSatellite(m, true); setRegion(m, "famagusta"); setLoaded(true) })
      m.on("click", (e) => changeRef.current(+e.lngLat.lat.toFixed(6), +e.lngLat.lng.toFixed(6)))
    })
    return () => { cancelled = true; map.current?.remove(); map.current = null; marker.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once; position updates below
  }, [])

  useEffect(() => {
    if (loaded && map.current) applyMapTheme(map.current, resolvedTheme === "dark")
  }, [loaded, resolvedTheme])

  // Keep the pin in sync with the form fields.
  useEffect(() => {
    const m = map.current, lib = ml.current
    if (!m || !lib || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (!marker.current) {
      marker.current = new lib.Marker({ element: pinElement(type), anchor: "bottom", offset: [0, -6], draggable: true })
        .setLngLat([lng, lat]).addTo(m)
      marker.current.on("dragend", () => {
        const p = marker.current!.getLngLat()
        changeRef.current(+p.lat.toFixed(6), +p.lng.toFixed(6))
      })
    } else {
      marker.current.setLngLat([lng, lat])
    }
    marker.current.getElement().className = marker.current.getElement().className.replace(/pin-\w+/, `pin-${type}`)
    if (!m.getBounds().contains([lng, lat])) m.flyTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), 15) })
  })

  return <div ref={el} className="h-80 overflow-hidden rounded-lg bg-muted" />
}
