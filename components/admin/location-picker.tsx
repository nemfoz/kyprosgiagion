"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, LocateFixed } from "lucide-react"
import { toast } from "sonner"
import type { Map as MlMap, Marker } from "maplibre-gl"
import { useAdminT } from "@/components/i18n-provider"
import { ButtonsControl, collapseAttribution, mapStyle, pinElement, PIXEL_RATIO, setRegion, setSatellite } from "@/components/map/terrain"
import type { Bounds } from "@/lib/editions"

/**
 * Satellite map for placing a church precisely: click or drag the pin, or (standing at the church) use the phone's
 * location. `area` is the chosen region: its outline is shown, and the map shows it while there is no pin yet.
 */
export function LocationPicker({ lat, lng, type, onChange, area }: {
  lat: number | null; lng: number | null; type: string; onChange: (lat: number, lng: number) => void
  area?: { id: string; bounds: Bounds; boundary: boolean }
}) {
  const t = useAdminT()
  const tRef = useRef(t)
  useEffect(() => { tRef.current = t })
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const ml = useRef<typeof import("maplibre-gl") | null>(null)
  const changeRef = useRef(onChange)
  useEffect(() => { changeRef.current = onChange })

  useEffect(() => {
    let cancelled = false
    import("maplibre-gl").then((lib) => {
      if (cancelled || !el.current) return
      ml.current = lib
      const has = lat != null && lng != null
      const [[s, w], [n, e]] = area?.bounds ?? [[34.9, 33.5], [35.7, 34.6]]
      const m = new lib.Map({
        container: el.current, style: mapStyle(), attributionControl: { compact: true }, pixelRatio: PIXEL_RATIO(),
        ...(has ? { center: [lng!, lat!] as [number, number], zoom: 15 } : { bounds: [[w, s], [e, n]] as [[number, number], [number, number]] }),
      })
      map.current = m
      m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right")
      let satellite = true
      m.addControl(new ButtonsControl([{ label: () => tRef.current(satellite ? "map" : "satellite"), onClick: () => { satellite = !satellite; setSatellite(m, satellite) } }]), "top-left")
      m.getCanvas().style.cursor = "crosshair"
      m.on("load", () => { collapseAttribution(m); setSatellite(m, true); setRegion(m, area?.boundary ? area.id : undefined) })
      m.on("click", (e) => changeRef.current(+e.lngLat.lat.toFixed(6), +e.lngLat.lng.toFixed(6)))
    })
    return () => { cancelled = true; map.current?.remove(); map.current = null; marker.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once; position updates below
  }, [])

  // Another region chosen: show its outline, and the region itself while there's no pin.
  const areaId = area?.id
  useEffect(() => {
    const m = map.current
    if (!m || !area) return
    const apply = () => {
      setRegion(m, area.boundary ? area.id : undefined)
      if (lat == null || lng == null) {
        const [[s, w], [n, e]] = area.bounds
        m.fitBounds([[w, s], [e, n]], { duration: 800 })
      }
    }
    if (m.loaded()) apply()
    else m.once("load", apply)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the region changes
  }, [areaId])

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

  const [locating, setLocating] = useState(false)
  function locateMe() {
    if (!navigator.geolocation) { toast.error(t("editor.location.failed")); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocating(false)
      changeRef.current(+pos.coords.latitude.toFixed(6), +pos.coords.longitude.toFixed(6))
      map.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 17 })
    }, () => { setLocating(false); toast.error(t("editor.location.failed")) }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
  }

  return (
    <div className="relative">
      <div ref={el} className="h-80 overflow-hidden rounded-lg bg-muted" />
      <button
        type="button" onClick={locateMe} disabled={locating}
        className="absolute bottom-3 left-3 flex h-10 items-center gap-2 rounded-full border bg-card px-3.5 text-sm font-semibold shadow-md"
      >
        {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4 text-primary" />}{t("editor.location.here")}
      </button>
    </div>
  )
}
