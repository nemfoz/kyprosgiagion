"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import type { GeoJSONSource, MapGeoJSONFeature, Map as MlMap, Popup } from "maplibre-gl"
import { ArrowLeft, ArrowRight, CalendarDays, CircleCheck, Footprints, Landmark, LayoutDashboard, Loader2, LocateFixed, LogIn, MapPin, Navigation, Search, SlidersHorizontal, Sparkles, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { NameDayBar, type NameDays } from "@/components/namedays/nameday-bar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SITE_TYPES, TYPE_LABELS, type Lang, type SiteType } from "@/lib/content"
import { baseLang, intlLocale, localePath, tr, type Locale } from "@/lib/locales"
import { trData } from "@/lib/i18n"
import { LangMenu } from "@/components/lang-menu"
import { MobileNav } from "@/components/mobile-nav"
import { useT } from "@/components/i18n-provider"
import { places, regionAncestors, regionName, regionTree, type Region } from "@/lib/regions"
import { cn } from "@/lib/utils"
import { brandName, editionPaths, type Bounds, type Camera } from "@/lib/editions"
import { INFO_PAGES, PAGE_TITLE_KEY } from "@/lib/pages"
import { FooterCredits } from "@/components/footer-credits"
import { TypeBadge, typeBorder, typeDot, typeText } from "@/components/type-badge"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { addSiteLayers, ButtonsControl, collapseAttribution, mapStyle, PIN_LAYERS, PIXEL_RATIO, setMe, setPlaces, setRegion, setSatellite, setSitePoints, setTerrain } from "./terrain"
import { sized } from "@/lib/photo-sizes.mjs"
import { directionsUrl, distanceKm, formatDistance } from "@/lib/geo"

export type MapSite = {
  id: number
  slug: string
  type: SiteType
  region: string
  lat: number
  lng: number
  coordsVerified: boolean
  cover: string | null
  /** Page completeness; null for visitors who aren't signed in. */
  percent: number | null
  /** The signed-in user has marked it as visited. */
  visited: boolean
  metropolisId: number | null
  name: Partial<Record<Locale, string>>
  location: Partial<Record<Locale, string>>
  summary: Partial<Record<Locale, string>>
}

/** The edition shown: its title and "all regions" label in every language, and its map area. */
export type MapEdition = {
  id: string
  title: Partial<Record<Locale, string>>
  allLabel: Partial<Record<Locale, string>>
  bounds: Bounds
  camera: Camera | null
}

type Props = {
  edition: MapEdition
  /** The edition's active regions. */
  regions: Region[]
  /** The region the map opens on when the address names none ("all": the whole edition). */
  defaultRegion: string
  sites: MapSite[]
  initialLang: Locale
  initialRegion: string
  initialMetropolis?: string
  /** Metropolises that have churches on the map. */
  metropolises: { id: number; slug: string; name: Partial<Record<Locale, string>> }[]
  initialSlug?: string
  account: { name: string } | null
  nameDays: Record<Lang, NameDays>
  /** The Foundation's link for the credits under the list (lib/pages.ts). */
  foundationUrl: string
}

const ALL_ID = "all"
const fold = (s: string) => s.toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "")

// Phones: the list is a sheet over the map, dragged between three heights.
type Snap = "peek" | "half" | "full"
const PEEK = 196

/** Padding around framed pins; `bottom` is the part of the map hidden under the sheet on phones. */
const framePadding = (p: number, bottom: number) => ({ top: p, left: p, right: p, bottom: p + bottom })

/** Camera for a region; `fit` frames a set of pins exactly (no extra zoom, more padding). */
function regionCamera(map: MlMap, r: Region, is3d: boolean, fit = false, bottom = 0) {
  const [[s, w], [n, e]] = r.bounds
  const bearing = is3d ? r.camera?.bearing ?? 0 : 0
  const cam = map.cameraForBounds([[w, s], [e, n]], { bearing, padding: framePadding(fit ? 70 : 30, bottom) })
  const wide = map.getContainer().clientWidth > 700
  const extra = fit || !is3d ? 0 : wide ? 0.35 : -0.1
  return { ...cam, bearing, pitch: is3d ? r.camera?.pitch ?? 50 : 0, zoom: (cam?.zoom ?? 8) + extra }
}

export function Explorer({ edition, regions: active, defaultRegion, sites, initialLang, initialRegion, initialMetropolis, metropolises, initialSlug, account, nameDays, foundationUrl }: Props) {
  const t = useT()
  const paths = editionPaths(edition.id)
  const siteName = (l: Locale) => tr(edition.title, l)
  // "All" (the whole edition) first, then the regions, parents first with their sub-regions after them.
  const regions = useMemo(() => {
    const all: Region = { id: ALL_ID, edition: edition.id, parent: null, sort: -1, name: { el: "", en: "" }, bounds: edition.bounds, camera: edition.camera, hasBoundary: false, active: true }
    return [all, ...regionTree(active)]
  }, [active, edition])
  const regionLabel = (r: Region, l: Locale) => (r.id === ALL_ID ? tr(edition.allLabel, l) : regionName(r, l))
  const [lang, setLang] = useState<Locale>(initialLang)
  const [regionId, setRegionId] = useState(initialRegion)
  const [metroId, setMetroId] = useState<number | null>(() => metropolises.find((m) => m.slug === initialMetropolis)?.id ?? null)
  const [types, setTypes] = useState<Set<SiteType>>(() => new Set(SITE_TYPES))
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<number | null>(() => sites.find((s) => s.slug === initialSlug)?.id ?? null)
  const [ready, setReady] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [snap, setSnap] = useState<Snap>(() => (initialSlug ? "half" : "peek"))
  const [dragH, setDragH] = useState<number | null>(null)
  const [areaH, setAreaH] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const areaEl = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null)

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null)
  const tip = useRef<Popup | null>(null)
  const view = useRef({ is3d: true, satellite: false })
  const langRef = useRef(lang)
  const controls = useRef<ButtonsControl | null>(null)

  const region = regions.find((r) => r.id === regionId) ?? regions[0]
  const sitesWithRegions = useMemo(() => sites.map((s) => ({ ...s, regions: regionAncestors(active, s.region) })), [sites, active])
  const visible = useMemo(() => {
    const q = fold(query.trim())
    return sitesWithRegions.filter((s) =>
      (regionId === ALL_ID || s.regions.includes(regionId)) && (metroId === null || s.metropolisId === metroId) && types.has(s.type) &&
      (!q || fold([...Object.values(s.name), ...Object.values(s.location)].join(" ")).includes(q)))
  }, [sitesWithRegions, regionId, metroId, types, query])
  const current = sites.find((s) => s.id === selected) ?? null
  const name = (s: MapSite) => tr(s.name, lang)

  // ---- phone layout: sheet heights ----
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    const ro = new ResizeObserver(([e]) => setAreaH(e.contentRect.height))
    if (areaEl.current) ro.observe(areaEl.current)
    return () => { mq.removeEventListener("change", update); ro.disconnect() }
  }, [])
  const snapHeight = (k: Snap) => (!areaH ? PEEK : k === "peek" ? Math.min(PEEK, areaH) : k === "half" ? Math.round(areaH * 0.52) : areaH - 10)
  const sheetH = dragH ?? snapHeight(snap)
  // The part of the map hidden under the sheet, for centring the camera on what is still visible.
  const inset = mobile ? Math.min(sheetH, Math.round(areaH * 0.6)) : 0
  const insetRef = useRef(inset)
  const mobileRef = useRef(mobile)
  useEffect(() => { insetRef.current = inset; mobileRef.current = mobile })

  /** Opens a church; on phones its card fills the lower half of the screen. */
  function choose(id: number) {
    setSelected(id)
    if (mobileRef.current) setSnap("half")
  }

  function dragStart(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, h: sheetH, moved: false }
  }
  function dragMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dy = d.y - e.clientY
    if (Math.abs(dy) > 6) d.moved = true
    if (d.moved) setDragH(Math.min(Math.max(d.h + dy, PEEK - 40), areaH - 10))
  }
  function dragEnd() {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) setSnap(snap === "peek" ? "half" : "peek") // a tap on the handle opens or closes the sheet
    else if (dragH !== null) {
      const heights: Snap[] = ["peek", "half", "full"]
      setSnap(heights.reduce((a, b) => (Math.abs(snapHeight(b) - dragH) < Math.abs(snapHeight(a) - dragH) ? b : a)))
    }
    setDragH(null)
  }

  // ---- map setup (once) ----
  useEffect(() => {
    let map: MlMap | undefined
    let cancelled = false
    try {
      const saved = JSON.parse(localStorage.getItem("mapPrefs") || "{}")
      view.current = { is3d: saved.is3d ?? true, satellite: saved.satellite ?? false }
    } catch {}
    const savePrefs = () => { try { localStorage.setItem("mapPrefs", JSON.stringify(view.current)) } catch {} }

    import("maplibre-gl").then((ml) => {
      if (cancelled || !mapEl.current) return
      mlRef.current = ml
      map = new ml.Map({
        container: mapEl.current,
        style: mapStyle({ world: edition.id !== "cyprus" }),
        // the whole edition first, then fly into the region
        bounds: [[edition.bounds[0][1], edition.bounds[0][0]], [edition.bounds[1][1], edition.bounds[1][0]]],
        maxPitch: 65, minZoom: 3, attributionControl: { compact: true }, pixelRatio: PIXEL_RATIO(),
      })
      mapRef.current = map
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right")
      controls.current = new ButtonsControl([
        {
          label: () => (view.current.is3d ? "2D" : "3D"),
          onClick: () => { view.current.is3d = !view.current.is3d; setTerrain(map!, view.current.is3d); savePrefs(); window.dispatchEvent(new Event("ka:view")) },
        },
        {
          label: () => t(view.current.satellite ? "map" : "satellite", langRef.current),
          onClick: () => { view.current.satellite = !view.current.satellite; setSatellite(map!, view.current.satellite); savePrefs() },
        },
      ])
      map.addControl(controls.current, "top-right")
      map.on("load", () => {
        collapseAttribution(map!)
        setTerrain(map!, view.current.is3d)
        setSatellite(map!, view.current.satellite)
        addSiteLayers(map!)
        setReady(true)
      })
    })
    return () => { cancelled = true; map?.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; t only changes with the text overrides
  }, [])

  // ---- place labels (language-dependent) ----
  useEffect(() => {
    langRef.current = lang
    controls.current?.refresh()
    const map = mapRef.current
    if (!ready || !map) return
    if (edition.id === "cyprus") setPlaces(map, places.map((p) => ({ lng: p.lng, lat: p.lat, text: p[baseLang(lang)], major: !!p.major })))
  }, [lang, ready, edition.id])

  // ---- pins ----
  // Drawn by the map (clustered up to zoom 13); the selected church keeps its own, larger pin.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const point = (s: MapSite) => ({ id: s.id, type: s.type, lng: s.lng, lat: s.lat, approx: !s.coordsVerified })
    const chosen = visible.find((s) => s.id === selected)
    setSitePoints(map, visible.filter((s) => s.id !== selected).map(point), chosen ? point(chosen) : null)
  }, [visible, selected, ready])

  // Hover names, clicks on pins and clusters.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const hit = (point: { x: number; y: number }): MapGeoJSONFeature | undefined => map.queryRenderedFeatures([point.x, point.y], { layers: PIN_LAYERS })[0]
    let hovered: string | number | undefined
    const onMove = async (e: { point: { x: number; y: number } }) => {
      const f = hit(e.point)
      map.getCanvas().style.cursor = f ? "pointer" : ""
      const key = f ? f.properties.cluster_id ?? `s${f.properties.id}` : undefined
      if (key === hovered) return
      hovered = key
      if (!f) { tip.current?.remove(); return }
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      if (f.properties.cluster) {
        const leaves = await (map.getSource("sites") as GeoJSONSource).getClusterLeaves(f.properties.cluster_id, 5, 0)
        if (hovered !== key) return
        const names = leaves.map((l) => sites.find((s) => s.id === l.properties?.id)).filter(Boolean).map((s) => tr(s!.name, langRef.current))
        showTipAt(lng, lat, names.join(" · ") + (f.properties.point_count > 5 ? " …" : ""))
      } else {
        const s = sites.find((x) => x.id === f.properties.id)
        if (s) showTip(s)
      }
    }
    const onLeave = () => { hovered = undefined; tip.current?.remove(); map.getCanvas().style.cursor = "" }
    map.on("mousemove", onMove)
    map.on("mouseout", onLeave)
    return () => { map.off("mousemove", onMove); map.off("mouseout", onLeave) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showTip only reads refs
  }, [ready, sites])

  function showTip(s: MapSite) {
    showTipAt(s.lng, s.lat, tr(s.name, langRef.current), 36)
  }

  function showTipAt(lng: number, lat: number, text: string, offset = 24) {
    const map = mapRef.current, ml = mlRef.current
    if (!map || !ml) return
    tip.current?.remove()
    tip.current = new ml.Popup({ closeButton: false, closeOnClick: false, offset, className: "site-tip" })
      .setLngLat([lng, lat]).setText(text).addTo(map)
  }

  // ---- near me ----
  function locate() {
    if (!navigator.geolocation) { toast.error(t("locateFailed", lang)); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocating(false)
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setHere(p)
      setSelected(null)
      const near = [...visible].sort((a, b) => distanceKm(p, a) - distanceKm(p, b)).slice(0, 3)
      const map = mapRef.current
      if (!near.length || distanceKm(p, near[0]) > 60) { toast(t("farAway", lang)); return }
      if (mobile) setSnap("half")
      if (!map) return
      const pts = [p, ...near]
      const cam = map.cameraForBounds(
        [[Math.min(...pts.map((x) => x.lng)), Math.min(...pts.map((x) => x.lat))], [Math.max(...pts.map((x) => x.lng)), Math.max(...pts.map((x) => x.lat))]],
        { bearing: map.getBearing(), padding: framePadding(60, mobile ? Math.round(areaH * 0.52) : 0) },
      )
      if (cam) map.flyTo({ ...cam, zoom: Math.min(cam.zoom ?? 13, 14), pitch: view.current.is3d ? 50 : 0, duration: 1800, essential: true })
    }, () => { setLocating(false); toast.error(t("locateFailed", lang)) }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
  }

  useEffect(() => {
    const map = mapRef.current
    if (ready && map) setMe(map, here)
  }, [here, ready])

  // ---- camera ----
  // With a Metropolis chosen, frame its churches (in the chosen region); otherwise the region.
  const area = (): Region => {
    const pins = metroId === null ? [] : visible
    if (!pins.length) return region
    const pad = 0.03
    return {
      ...region,
      bounds: [
        [Math.min(...pins.map((s) => s.lat)) - pad, Math.min(...pins.map((s) => s.lng)) - pad],
        [Math.max(...pins.map((s) => s.lat)) + pad, Math.max(...pins.map((s) => s.lng)) + pad],
      ],
    }
  }
  const firstFly = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    setRegion(map, region.hasBoundary ? region.id : undefined)
    if (firstFly.current && selected) { firstFly.current = false; return } // deep link: fly to the site instead
    firstFly.current = false
    map.flyTo({ ...regionCamera(map, area(), view.current.is3d, metroId !== null, insetRef.current), duration: 2200, essential: true, curve: 1.2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the region or Metropolis changes
  }, [regionId, metroId, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    tip.current?.remove()
    const s = sites.find((x) => x.id === selected)
    if (s) {
      // On phones the church opens in the half-height sheet; keep its pin in the visible part above it.
      const below = mobile ? Math.round(areaH * 0.52) : 0
      map.flyTo({
        center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 13.2), offset: [0, -below / 2],
        pitch: view.current.is3d ? 62 : 0, bearing: view.current.is3d ? map.getBearing() - 15 : 0,
        duration: 2000, essential: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selection changes, not when the sheet resizes
  }, [selected, ready, sites])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onView = () => {
      if (selected) map.easeTo({ pitch: view.current.is3d ? 60 : 0, bearing: view.current.is3d ? map.getBearing() : 0, duration: 800 })
      else map.easeTo({ ...regionCamera(map, area(), view.current.is3d, metroId !== null, insetRef.current), duration: 900 })
    }
    // A pin opens its church, a cluster zooms in to it, anywhere else closes the open church.
    const onClick = async (e: { point: { x: number; y: number } }) => {
      const f = map.queryRenderedFeatures([e.point.x, e.point.y], { layers: PIN_LAYERS })[0]
      if (f?.properties.cluster) {
        tip.current?.remove()
        const z = await (map.getSource("sites") as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id)
        map.flyTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: Math.min(z + 0.2, 15), duration: 1200, essential: true })
      } else if (f) choose(f.properties.id)
      else if (selected) back()
    }
    // Phones: moving the map lowers the list out of the way.
    const onDrag = () => { if (mobile && !selected && snap === "half") setSnap("peek") }
    window.addEventListener("ka:view", onView)
    map.on("click", onClick)
    map.on("dragstart", onDrag)
    return () => { window.removeEventListener("ka:view", onView); map.off("click", onClick); map.off("dragstart", onDrag) }
  })

  function back() {
    setSelected(null)
    const map = mapRef.current
    if (map) map.flyTo({ ...regionCamera(map, area(), view.current.is3d, metroId !== null, insetRef.current), duration: 1500 })
  }

  // ---- URL ----
  useEffect(() => {
    const p = new URLSearchParams()
    if (regionId !== defaultRegion) p.set("region", regionId)
    const metro = metropolises.find((m) => m.id === metroId)
    if (metro) p.set("metropolis", metro.slug)
    if (current) p.set("site", current.slug)
    history.replaceState(null, "", localePath(`${editionPaths(edition.id).map}${p.size ? `?${p}` : ""}`, lang))
    document.documentElement.lang = lang
    document.title = `${tr(edition.title, lang)} – ${brandName(lang)}`
  }, [lang, regionId, defaultRegion, metroId, metropolises, current, edition])

  // Alphabetical, or nearest first after "Near me".
  const km = (s: MapSite) => (here ? distanceKm(here, s) : 0)
  const list = [...visible].sort((a, b) => (here ? km(a) - km(b) : name(a).localeCompare(name(b), intlLocale(lang))))
  const activeFilters = (regionId !== defaultRegion ? 1 : 0) + (metroId !== null ? 1 : 0) + (types.size < SITE_TYPES.length ? 1 : 0)
  const handle = (
    <div
      className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
      onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
      aria-hidden
    >
      <span className="h-1.5 w-11 rounded-full bg-border" />
    </div>
  )
  const siteHref = (s: MapSite) => localePath(paths.site(s.slug), lang)

  return (
    <div className="flex h-dvh flex-col bg-background" style={{ "--sheet-h": `${sheetH}px` } as React.CSSProperties}>
      <NameDayBar days={nameDays[baseLang(lang)]} lang={lang} />
      <header className="z-10 flex shrink-0 items-center gap-x-3 border-b bg-card px-4 py-2.5 md:h-22 md:gap-x-7 md:px-7 md:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <Link href={localePath("/", lang)} aria-label={brandName(lang)} className="grid h-9 w-8 flex-none place-items-center rounded-t-[22px] rounded-b-[7px] border border-border bg-accent text-[22px] text-primary md:h-12 md:w-[42px] md:text-[26px]">☦</Link>
          <span className="grid min-w-0 gap-1 md:gap-2">
            <Link href={localePath("/", lang)} className="truncate font-heading text-base leading-none font-bold whitespace-nowrap md:text-xl">{brandName(lang)}</Link>
            <Link href={localePath(paths.home, lang)} className="truncate text-[11px] leading-none tracking-wide text-muted-foreground hover:text-primary">{siteName(lang)}<span className="max-lg:hidden"> · {t("caption", lang)}</span></Link>
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {([
            [paths.metropolises, "navMetropolises", <Landmark key="m" />],
            ["/eortologio", "navNameDays", <CalendarDays key="n" />],
            ["/contribute", "contribute", <Sparkles key="c" />],
          ] as const).map(([href, key, icon]) => (
            <Button key={href} variant="ghost" size="sm" className="max-md:hidden" asChild>
              <Link href={localePath(href, lang)} aria-label={t(key, lang)}>{icon}<span className="hidden xl:inline">{t(key, lang)}</span></Link>
            </Button>
          ))}
          <LangMenu lang={lang} onChange={setLang} />
          {account && (
            <Button variant="ghost" size="sm" className="max-md:hidden" asChild>
              <Link href={localePath("/profile", lang)} aria-label={t("myOdoiporiko", lang)}><Footprints /><span className="hidden 2xl:inline">{t("myOdoiporiko", lang)}</span></Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="max-md:hidden" asChild>
            <Link href={account ? "/admin" : localePath("/login", lang)}>
              {account ? <LayoutDashboard /> : <LogIn />}
              <span className="hidden lg:inline">{account ? t("dashboard", lang) : t("signIn", lang)}</span>
            </Link>
          </Button>
          <MobileNav lang={lang} signedIn={!!account} edition={{ id: edition.id, title: siteName(lang) }} />
        </div>
      </header>

      {/* Phones: the map fills the screen and the list is a sheet over it. Wider screens: list | map. */}
      <div ref={areaEl} className="relative min-h-0 flex-1 md:grid md:grid-cols-[330px_minmax(0,1fr)] md:grid-rows-1 md:gap-3 md:p-3 lg:grid-cols-[370px_minmax(0,1fr)] lg:gap-4 lg:p-4 2xl:grid-cols-[400px_minmax(0,1fr)] 2xl:gap-5 2xl:p-5">
        <aside className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex h-(--sheet-h) flex-col overflow-hidden rounded-t-2xl border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_color-mix(in_oklab,var(--ink)_14%,transparent)] transition-[height] duration-300 ease-out",
          "md:relative md:inset-auto md:z-auto md:h-auto md:min-h-0 md:rounded-2xl md:border md:pb-0 md:shadow-sm md:transition-none",
          dragH !== null && "transition-none",
        )}>
          {handle}
          {current ? (
            <ScrollArea className="min-h-0 flex-1">
              <div className="pb-5">
                <Button variant="link" className="h-10 px-5 text-sm md:px-6 md:pt-5 md:text-xs" onClick={back}><ArrowLeft />{t("back", lang)}</Button>
                <div className="grid gap-3 px-5 pt-1 pb-4 md:px-6 md:py-4">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <TypeBadge type={current.type} lang={lang} />
                    {current.visited && <span className="flex items-center gap-1 text-xs font-semibold text-primary"><CircleCheck className="size-3.5" />{t("visitedBadge", lang)}</span>}
                  </span>
                  <h2 className="text-2xl leading-snug font-bold md:text-[27px]">{name(current)}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" />{tr(current.location, lang)}</p>
                  {here && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><LocateFixed className="size-4 shrink-0" />{formatDistance(km(current), lang)}</p>}
                  {!current.coordsVerified && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><TriangleAlert className="size-4 shrink-0 text-gold" />{t("approx", lang)}</p>
                  )}
                </div>
                {current.cover && (
                  <Link href={siteHref(current)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- stored photos come at any size */}
                    <img src={sized(current.cover, "md")} alt="" className="aspect-[16/10] w-full object-cover" />
                  </Link>
                )}
                <div className="grid gap-5 px-5 pt-5 md:px-6">
                  <p className="text-[15px] leading-[1.75] md:text-sm md:leading-[1.8]">{tr(current.summary, lang)}</p>
                  {current.percent !== null && current.percent < 100 && (
                    <Link href={`${siteHref(current)}#contribute`} className="grid gap-1.5 rounded-lg border border-gold/40 bg-accent/40 p-3 text-xs">
                      <span className="flex justify-between"><span>{t("completeness", lang)}</span><b className="text-gold-deep">{current.percent}%</b></span>
                      <ProgressBar percent={current.percent} className="h-1.5" />
                      <span className="text-primary underline">{t("helpComplete", lang)}</span>
                    </Link>
                  )}
                  <div className="grid gap-2">
                    <Button asChild size="lg" className="h-11"><Link href={siteHref(current)}>{t("more", lang)}<ArrowRight /></Link></Button>
                    <Button asChild size="lg" variant="outline" className="h-11">
                      <a href={directionsUrl(current.lat, current.lng)} target="_blank" rel="noopener"><Navigation />{t("directions", lang)}</a>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <>
              <div className="grid gap-2.5 border-b px-4 pb-3 md:gap-4 md:px-6 md:pt-6 md:pb-5 2xl:px-7 2xl:pt-7">
                <div className="hidden md:block">
                  <p className="mb-3 text-[10px] font-semibold tracking-[.14em] text-muted-foreground">{t("eyebrow", lang)}</p>
                  <h1 className="mb-2.5 text-[27px] leading-snug font-bold tracking-tight 2xl:text-3xl">{t("title", lang)}</h1>
                  <p className="text-xs leading-[1.85] text-muted-foreground">{t("description", lang)}</p>
                </div>
                <div className="flex gap-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-input bg-muted/60 px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                    <Search className="size-[18px] flex-none text-muted-foreground" />
                    <input
                      type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search", lang)} aria-label={t("search", lang)}
                      onFocus={() => { if (mobile) setSnap("full") }}
                      className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none md:h-auto md:py-3 md:text-xs"
                    />
                  </label>
                  <Button
                    type="button" variant="outline" className="relative size-11 shrink-0 md:hidden" aria-label={t("filters", lang)}
                    aria-expanded={filtersOpen} onClick={() => { setFiltersOpen((o) => !o); setSnap("full") }}
                  >
                    <SlidersHorizontal className="size-5" />
                    {activeFilters > 0 && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{activeFilters}</span>}
                  </Button>
                </div>
                <div className={cn("grid gap-2.5 md:gap-4", !filtersOpen && "max-md:hidden")}>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                    {regions.length > 1 && (
                      <Select value={regionId} onValueChange={(r) => { setRegionId(r); setSelected(null) }}>
                        <SelectTrigger size="sm" className="w-full min-w-0 text-sm max-md:h-11! md:text-xs" aria-label={t("filterRegion", lang)}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {regions.map((r) => (
                            <SelectItem key={r.id} value={r.id} className={cn("py-2.5 text-sm md:py-1.5 md:text-xs", r.parent && "pl-6")}>{regionLabel(r, lang)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {metropolises.length > 0 && (
                      <Select value={String(metroId ?? "all")} onValueChange={(m) => { setMetroId(m === "all" ? null : Number(m)); setSelected(null) }}>
                        <SelectTrigger size="sm" className={cn("w-full min-w-0 text-sm max-md:h-11! md:text-xs", regions.length <= 1 && "sm:col-span-2 md:col-span-1")} aria-label={t("filterMetropolis", lang)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="py-2.5 text-sm md:py-1.5 md:text-xs">{t("allMetropolises", lang)}</SelectItem>
                          {metropolises.map((m) => <SelectItem key={m.id} value={String(m.id)} className="py-2.5 text-sm md:py-1.5 md:text-xs">{tr(m.name, lang)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SITE_TYPES.map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={types.has(k)}
                        onClick={() => setTypes((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n })}
                        className="group flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm transition hover:bg-accent aria-pressed:bg-accent/70 aria-[pressed=false]:border-dashed aria-[pressed=false]:text-muted-foreground md:min-h-0 md:px-2.5 md:py-1.5 md:text-[11px]"
                      >
                        <span className={cn("size-2 rounded-full border border-transparent group-aria-[pressed=false]:bg-transparent! md:size-[7px]", typeDot[k], typeBorder[k])} />
                        {trData(`data.type.${k}`, TYPE_LABELS[k], lang)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <p className="flex min-h-10 items-center justify-between px-5 pt-2 pb-1 text-xs text-muted-foreground md:min-h-0 md:px-6 md:pt-5 md:pb-3 md:text-[11px]">
                  <span>{t(list.length === 1 ? "countOne" : "countMany", lang, { n: list.length })}</span>
                  {here ? (
                    <button type="button" onClick={() => setHere(null)} className="-my-2 rounded-md px-2 py-2 text-xs text-primary underline underline-offset-2 md:text-[11px]">
                      {t("sortByName", lang)}
                    </button>
                  ) : <span className="text-[10px] tracking-[.12em] md:text-[9px]">{t("results", lang)}</span>}
                </p>
                {list.length === 0 && <p className="px-6 text-sm text-muted-foreground">{t("none", lang)}</p>}
                <ul className="divide-y divide-border px-3 pb-4">
                  {list.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => choose(s.id)}
                        onMouseEnter={() => showTip(s)}
                        onMouseLeave={() => tip.current?.remove()}
                        className="grid w-full grid-cols-[58px_minmax(0,1fr)_14px] items-center gap-3 rounded-lg p-2.5 text-left transition hover:bg-muted md:py-3.5"
                      >
                        {s.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sized(s.cover, "sm")} alt="" loading="lazy" className="h-14 w-[58px] rounded-t-[30px] rounded-b-lg border border-border object-cover md:h-[68px]" />
                        ) : (
                          <span className={cn("grid h-14 w-[58px] place-items-center rounded-t-[30px] rounded-b-lg border border-border bg-muted text-[25px] md:h-[68px]", typeText[s.type])}>✝</span>
                        )}
                        <span className="min-w-0">
                          <span className={cn("block text-[10px] tracking-[.07em] uppercase md:text-[9px]", typeText[s.type])}>{trData(`data.type.${s.type}`, TYPE_LABELS[s.type], lang)}</span>
                          <span className="mt-0.5 mb-1 block font-heading text-[15px] leading-snug font-medium md:text-sm md:leading-normal">{name(s)}</span>
                          <span className="block truncate text-xs text-muted-foreground md:text-[11px]">
                            {here && <b className="font-semibold text-gold-deep">{formatDistance(km(s), lang)} · </b>}
                            {s.location[lang] || s.location.el}
                          </span>
                        </span>
                        {s.visited
                          ? <CircleCheck aria-label={t("visitedBadge", lang)} className="size-4 text-primary" />
                          : <span aria-hidden className="text-[17px] text-muted-foreground">↗</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="grid gap-2 border-t px-5 py-4 text-[11px] text-muted-foreground md:px-6">
                  <nav className="flex flex-wrap gap-x-3 gap-y-1">
                    {INFO_PAGES.map((p) => <Link key={p} href={localePath(`/${p}`, lang)} className="hover:text-primary">{t(PAGE_TITLE_KEY[p], lang)}</Link>)}
                  </nav>
                  <FooterCredits foundationUrl={foundationUrl} project={t("footerProject", lang, { foundation: "\u0000" })} poweredBy={t("footerPoweredBy", lang)} />
                </div>
              </ScrollArea>
            </>
          )}
        </aside>
        <div className="absolute inset-0 min-h-0 min-w-0 overflow-hidden md:relative md:inset-auto md:rounded-2xl md:border md:border-border">
          <div ref={mapEl} className="map3d explorer-map size-full bg-[linear-gradient(var(--secondary),var(--parchment))]" />
          <button
            type="button" onClick={locate} disabled={locating} aria-label={t("nearMe", lang)}
            className={cn(
              "absolute left-3 bottom-[calc(var(--sheet-h)+12px)] z-[5] flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold shadow-md transition-[bottom] duration-300 ease-out",
              "md:top-3 md:bottom-auto md:h-9 md:px-3.5 md:text-xs md:transition-none",
              (snap === "full" || dragH !== null) && "max-md:hidden",
            )}
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4 text-primary" />}{t("nearMe", lang)}
          </button>
          <div className="pointer-events-none absolute bottom-7 left-5 hidden max-w-[calc(100%-40px)] items-center gap-2.5 rounded-lg border border-border bg-card/95 px-4 py-3 text-[10px] text-foreground/80 shadow-sm md:flex">
            <span className="size-1.5 flex-none rounded-full bg-primary" />
            <span className="font-semibold">{tr(metropolises.find((m) => m.id === metroId)?.name, lang) || regionLabel(region, lang)}</span>
            <span className="hidden h-3 w-px bg-border lg:block" />
            <span className="hidden text-muted-foreground lg:block">{current ? name(current) : t("hint", lang)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
