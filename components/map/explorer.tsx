"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import type { Map as MlMap, Marker, Popup } from "maplibre-gl"
import { ArrowLeft, ArrowRight, LayoutDashboard, LogIn, MapPin, Search, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SITE_TYPES, TYPE_LABELS, type Lang, type SiteType } from "@/lib/content"
import { UI, t } from "@/lib/i18n"
import { places, regionAncestors, regions as allRegions, siteTitle, defaultRegion, type Region } from "@/lib/regions"
import { cn } from "@/lib/utils"
import { TypeBadge, typeDot, typeText } from "@/components/type-badge"
import { ButtonsControl, collapseAttribution, mapStyle, pinElement, setRegion, setSatellite, setTerrain } from "./terrain"

export type MapSite = {
  id: number
  slug: string
  type: SiteType
  region: string
  lat: number
  lng: number
  coordsVerified: boolean
  cover: string | null
  name: Record<Lang, string>
  location: Record<Lang, string>
  summary: Record<Lang, string>
}

type Props = {
  sites: MapSite[]
  initialLang: Lang
  initialRegion: string
  initialSlug?: string
  account: { name: string } | null
}

const regions = allRegions.filter((r) => r.active)
const fold = (s: string) => s.toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "")

function regionCamera(map: MlMap, r: Region, is3d: boolean) {
  const [[s, w], [n, e]] = r.bounds
  const bearing = is3d ? r.camera?.bearing ?? 0 : 0
  const cam = map.cameraForBounds([[w, s], [e, n]], { bearing, padding: 30 })
  const wide = map.getContainer().clientWidth > 700
  return { ...cam, bearing, pitch: is3d ? r.camera?.pitch ?? 50 : 0, zoom: (cam?.zoom ?? 8) + (is3d ? (wide ? 0.35 : -0.1) : 0) }
}

export function Explorer({ sites, initialLang, initialRegion, initialSlug, account }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const [regionId, setRegionId] = useState(initialRegion)
  const [types, setTypes] = useState<Set<SiteType>>(() => new Set(SITE_TYPES))
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<number | null>(() => sites.find((s) => s.slug === initialSlug)?.id ?? null)
  const [ready, setReady] = useState(false)

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null)
  const markers = useRef(new Map<number, Marker>())
  const labels = useRef<Marker[]>([])
  const tip = useRef<Popup | null>(null)
  const view = useRef({ is3d: true, satellite: false })
  const langRef = useRef(lang)
  const controls = useRef<ButtonsControl | null>(null)

  const region = regions.find((r) => r.id === regionId) ?? regions[0]
  const sitesWithRegions = useMemo(() => sites.map((s) => ({ ...s, regions: regionAncestors(s.region) })), [sites])
  const visible = useMemo(() => {
    const q = fold(query.trim())
    return sitesWithRegions.filter((s) =>
      s.regions.includes(regionId) && types.has(s.type) &&
      (!q || fold([s.name.el, s.name.en, s.location.el, s.location.en].join(" ")).includes(q)))
  }, [sitesWithRegions, regionId, types, query])
  const current = sites.find((s) => s.id === selected) ?? null
  const name = (s: MapSite) => s.name[lang] || s.name.el || s.name.en

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
        style: mapStyle(),
        center: [33.4, 35.1], zoom: 7.6, // whole island first, then fly into the region
        maxPitch: 75, minZoom: 7, attributionControl: { compact: true },
      })
      mapRef.current = map
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right")
      const L = { "3d": { el: ["3D", "2D"], en: ["3D", "2D"] }, sat: { el: [UI.satellite.el, UI.map.el], en: [UI.satellite.en, UI.map.en] } }
      controls.current = new ButtonsControl([
        {
          label: () => L["3d"][langRef.current][view.current.is3d ? 1 : 0],
          onClick: () => { view.current.is3d = !view.current.is3d; setTerrain(map!, view.current.is3d); savePrefs(); window.dispatchEvent(new Event("ka:view")) },
        },
        {
          label: () => L.sat[langRef.current][view.current.satellite ? 1 : 0],
          onClick: () => { view.current.satellite = !view.current.satellite; setSatellite(map!, view.current.satellite); savePrefs() },
        },
      ])
      map.addControl(controls.current, "top-right")
      const zoomClass = () => map!.getContainer().classList.toggle("show-minor", map!.getZoom() >= 10.3)
      map.on("zoom", zoomClass)
      map.on("load", () => {
        collapseAttribution(map!)
        setTerrain(map!, view.current.is3d)
        setSatellite(map!, view.current.satellite)
        zoomClass()
        setReady(true)
      })
    })
    return () => { cancelled = true; map?.remove(); mapRef.current = null }
  }, [])

  // ---- place labels (language-dependent) ----
  useEffect(() => {
    langRef.current = lang
    controls.current?.refresh()
    const map = mapRef.current, ml = mlRef.current
    if (!ready || !map || !ml) return
    labels.current.splice(0).forEach((m) => m.remove())
    for (const p of places) {
      const el = Object.assign(document.createElement("div"), { className: cn("place-label", p.major && "major"), textContent: p[lang] })
      labels.current.push(new ml.Marker({ element: el, anchor: "top", offset: [0, 4] }).setLngLat([p.lng, p.lat]).addTo(map))
    }
  }, [lang, ready])

  // ---- markers ----
  useEffect(() => {
    const map = mapRef.current, ml = mlRef.current
    if (!ready || !map || !ml) return
    const show = new Set(visible.map((s) => s.id))
    for (const s of sites) {
      let m = markers.current.get(s.id)
      if (!m) {
        const el = pinElement(s.type, { approx: !s.coordsVerified })
        el.addEventListener("click", (e) => { e.stopPropagation(); setSelected(s.id) })
        el.addEventListener("mouseenter", () => showTip(s))
        el.addEventListener("mouseleave", () => tip.current?.remove())
        m = new ml.Marker({ element: el, anchor: "bottom", offset: [0, -6] }).setLngLat([s.lng, s.lat])
        markers.current.set(s.id, m)
      }
      m.getElement().classList.toggle("active", s.id === selected)
      m.getElement().style.zIndex = s.id === selected ? "2" : "1"
      if (show.has(s.id)) m.addTo(map)
      else m.remove()
    }
  }, [visible, selected, ready, sites])

  function showTip(s: MapSite) {
    const map = mapRef.current, ml = mlRef.current
    if (!map || !ml) return
    tip.current?.remove()
    tip.current = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 36, className: "site-tip" })
      .setLngLat([s.lng, s.lat]).setText(s.name[langRef.current] || s.name.el).addTo(map)
  }

  // ---- camera ----
  const firstFly = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    setRegion(map, region.boundary)
    if (firstFly.current && selected) { firstFly.current = false; return } // deep link: fly to the site instead
    firstFly.current = false
    map.flyTo({ ...regionCamera(map, region, view.current.is3d), duration: 2200, essential: true, curve: 1.2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the region changes
  }, [regionId, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    tip.current?.remove()
    const s = sites.find((x) => x.id === selected)
    if (s) {
      map.flyTo({
        center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 13.2),
        pitch: view.current.is3d ? 62 : 0, bearing: view.current.is3d ? map.getBearing() - 15 : 0,
        duration: 2000, essential: true,
      })
    }
  }, [selected, ready, sites])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onView = () => {
      if (selected) map.easeTo({ pitch: view.current.is3d ? 60 : 0, bearing: view.current.is3d ? map.getBearing() : 0, duration: 800 })
      else map.easeTo({ ...regionCamera(map, region, view.current.is3d), duration: 900 })
    }
    const onClick = () => { if (selected) back() }
    window.addEventListener("ka:view", onView)
    map.on("click", onClick)
    return () => { window.removeEventListener("ka:view", onView); map.off("click", onClick) }
  })

  function back() {
    setSelected(null)
    const map = mapRef.current
    if (map) map.flyTo({ ...regionCamera(map, region, view.current.is3d), duration: 1500 })
  }

  // ---- URL ----
  useEffect(() => {
    const p = new URLSearchParams()
    if (lang !== "el") p.set("lang", lang)
    if (regionId !== defaultRegion) p.set("region", regionId)
    if (current) p.set("site", current.slug)
    history.replaceState(null, "", `${location.pathname}${p.size ? `?${p}` : ""}`)
    document.documentElement.lang = lang
    document.title = siteTitle[lang]
  }, [lang, regionId, current])

  const list = [...visible].sort((a, b) => name(a).localeCompare(name(b), lang))
  const siteHref = (s: MapSite) => `/site/${encodeURIComponent(s.slug)}${lang === "en" ? "?lang=en" : ""}`

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold whitespace-nowrap">
          <span className="text-primary">☦</span>
          <span className="hidden sm:inline">{siteTitle[lang]}</span>
        </Link>
        {regions.length > 1 && (
          <div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg border bg-muted p-0.5" role="group" aria-label="Region">
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === regionId}
                onClick={() => { setRegionId(r.id); setSelected(null) }}
                className={cn(
                  "rounded-md px-3 py-1 text-sm whitespace-nowrap text-muted-foreground transition",
                  r.id === regionId && "bg-card font-semibold text-foreground shadow-sm",
                )}
              >
                {r.name[lang]}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "el" ? "en" : "el")}>
            {lang === "el" ? "EN" : "ΕΛ"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={account ? "/admin" : "/login"}>
              {account ? <LayoutDashboard /> : <LogIn />}
              <span className="hidden md:inline">{account ? t("dashboard", lang) : t("signIn", lang)}</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_42dvh] md:grid-cols-[380px_1fr] md:grid-rows-1">
        <aside className="order-2 flex min-h-0 flex-col border-t bg-card md:order-1 md:border-t-0 md:border-r">
          {current ? (
            <ScrollArea className="min-h-0 flex-1">
              <div className="pb-5">
                <Button variant="link" className="px-4 pt-3" onClick={back}><ArrowLeft />{t("back", lang)}</Button>
                <div className="grid gap-2 px-4 py-2">
                  <TypeBadge type={current.type} lang={lang} />
                  <h2 className="text-2xl font-bold">{name(current)}</h2>
                  <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-4" />{current.location[lang] || current.location.el}</p>
                  {!current.coordsVerified && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><TriangleAlert className="size-4 text-gold" />{t("approx", lang)}</p>
                  )}
                </div>
                {current.cover && (
                  <Link href={siteHref(current)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- photos come from Blob/uploads at any size */}
                    <img src={current.cover} alt="" className="aspect-[16/10] w-full object-cover" />
                  </Link>
                )}
                <div className="grid gap-4 px-4 pt-4">
                  <p className="leading-relaxed">{current.summary[lang] || current.summary.el}</p>
                  <Button asChild size="lg"><Link href={siteHref(current)}>{t("more", lang)}<ArrowRight /></Link></Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <>
              <div className="grid gap-2.5 border-b p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search", lang)} className="bg-background pl-8" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SITE_TYPES.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={types.has(k)}
                      onClick={() => setTypes((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n })}
                      className="flex items-center gap-1.5 rounded-full border bg-card py-0.5 pr-2.5 pl-1.5 text-[13px] transition aria-[pressed=false]:opacity-45"
                    >
                      <span className={cn("size-2.5 rounded-full", typeDot[k])} />{TYPE_LABELS[k][lang]}
                    </button>
                  ))}
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <p className="px-4 pt-3 pb-1 text-[13px] text-muted-foreground">{UI.count[lang](list.length)}</p>
                {list.length === 0 && <p className="px-4 text-sm text-muted-foreground">{t("none", lang)}</p>}
                <ul className="px-2 pb-4">
                  {list.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(s.id)}
                        onMouseEnter={() => showTip(s)}
                        onMouseLeave={() => tip.current?.remove()}
                        className="grid w-full grid-cols-[56px_1fr] items-center gap-3 rounded-lg p-2 text-left transition hover:bg-muted"
                      >
                        {s.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.cover} alt="" loading="lazy" className="size-14 rounded-lg border object-cover" />
                        ) : (
                          <span className={cn("grid size-14 place-items-center rounded-lg border bg-muted text-xl", typeText[s.type])}>✝</span>
                        )}
                        <span className="min-w-0">
                          <span className="block font-semibold">{name(s)}</span>
                          <span className="block truncate text-[13px] text-muted-foreground">{s.location[lang] || s.location.el}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </>
          )}
        </aside>
        <div ref={mapEl} className="map3d order-1 min-h-0 bg-[linear-gradient(#bcd6e6,#f4efe4)] md:order-2" />
      </div>
    </div>
  )
}
