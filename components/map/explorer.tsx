"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import type { Map as MlMap, Marker, Popup } from "maplibre-gl"
import { ArrowLeft, ArrowRight, LayoutDashboard, LogIn, MapPin, Search, Sparkles, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SITE_TYPES, TYPE_LABELS, type Lang, type SiteType } from "@/lib/content"
import { UI, t } from "@/lib/i18n"
import { places, regionAncestors, regions as allRegions, siteTitle, defaultRegion, type Region } from "@/lib/regions"
import { cn } from "@/lib/utils"
import { TypeBadge, typeBorder, typeDot, typeText } from "@/components/type-badge"
import { ProgressBar } from "@/components/gamify/completeness-card"
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
  percent: number
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
    <div className="flex h-dvh flex-col bg-background">
      <header className="z-10 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 md:gap-x-7 border-b bg-card px-4 py-3 md:h-22 md:flex-nowrap md:px-7 md:py-0">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <span aria-hidden className="grid h-9 w-8 flex-none place-items-center rounded-t-[22px] rounded-b-[7px] border border-border bg-accent text-[22px] text-primary md:h-12 md:w-[42px] md:text-[26px]">☦</span>
          <span className="grid min-w-0 gap-1 md:gap-2">
            <span className="font-heading text-base leading-none font-bold whitespace-nowrap md:text-xl">{siteTitle[lang]}</span>
            <span className="truncate text-[9px] tracking-wide text-muted-foreground md:text-[11px]">{t("caption", lang)}</span>
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1 md:order-last md:ml-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/contribute${lang === "en" ? "?lang=en" : ""}`}><Sparkles /><span className="hidden lg:inline">{t("contribute", lang)}</span></Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "el" ? "en" : "el")} aria-label={lang === "el" ? "Switch to English" : "Αλλαγή σε Ελληνικά"}>
            {lang === "el" ? "EN" : "ΕΛ"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={account ? "/admin" : "/login"}>
              {account ? <LayoutDashboard /> : <LogIn />}
              <span className="hidden lg:inline">{account ? t("dashboard", lang) : t("signIn", lang)}</span>
            </Link>
          </Button>
        </div>
        {regions.length > 1 && (
          <div className="order-3 flex w-full gap-1 rounded-xl bg-muted p-1 md:order-none md:ml-auto md:w-auto" role="group" aria-label="Region">
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === regionId}
                onClick={() => { setRegionId(r.id); setSelected(null) }}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground transition md:flex-none md:px-4 md:py-2",
                  r.id === regionId && "bg-card font-semibold text-primary shadow-sm",
                )}
              >
                {r.name[lang]}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(190px,43%)_minmax(0,1fr)] gap-2.5 p-2.5 md:grid-cols-[330px_minmax(0,1fr)] md:grid-rows-1 md:gap-3 md:p-3 lg:grid-cols-[370px_minmax(0,1fr)] lg:gap-4 lg:p-4 2xl:grid-cols-[400px_minmax(0,1fr)] 2xl:gap-5 2xl:p-5">
        <aside className="order-2 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm md:order-1 md:rounded-2xl">
          {current ? (
            <ScrollArea className="min-h-0 flex-1">
              <div className="pb-5">
                <Button variant="link" className="px-6 pt-5 text-xs" onClick={back}><ArrowLeft />{t("back", lang)}</Button>
                <div className="grid gap-3 px-6 py-4">
                  <TypeBadge type={current.type} lang={lang} />
                  <h2 className="text-[27px] leading-snug font-bold">{name(current)}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" />{current.location[lang] || current.location.el}</p>
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
                <div className="grid gap-5 px-6 pt-5">
                  <p className="text-sm leading-[1.8]">{current.summary[lang] || current.summary.el}</p>
                  {current.percent < 100 && (
                    <Link href={`${siteHref(current)}#contribute`} className="grid gap-1.5 rounded-lg border border-gold/40 bg-accent/40 p-3 text-xs">
                      <span className="flex justify-between"><span>{t("completeness", lang)}</span><b className="text-gold-deep">{current.percent}%</b></span>
                      <ProgressBar percent={current.percent} className="h-1.5" />
                      <span className="text-primary underline">{t("helpComplete", lang)}</span>
                    </Link>
                  )}
                  <Button asChild size="lg" className="h-11"><Link href={siteHref(current)}>{t("more", lang)}<ArrowRight /></Link></Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <>
              <div className="grid gap-2.5 border-b px-4 pt-3.5 pb-3 md:gap-4 md:px-6 md:pt-6 md:pb-5 2xl:px-7 2xl:pt-7">
                <div className="hidden md:block">
                  <p className="mb-3 text-[10px] font-semibold tracking-[.14em] text-muted-foreground">{t("eyebrow", lang)}</p>
                  <h1 className="mb-2.5 text-[27px] leading-snug font-bold tracking-tight 2xl:text-3xl">{t("title", lang)}</h1>
                  <p className="text-xs leading-[1.85] text-muted-foreground">{t("description", lang)}</p>
                </div>
                <label className="flex items-center gap-2.5 rounded-lg border border-input bg-muted/60 px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                  <Search className="size-[18px] flex-none text-muted-foreground" />
                  <input
                    type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search", lang)} aria-label={t("search", lang)}
                    className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none focus-visible:outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SITE_TYPES.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={types.has(k)}
                      onClick={() => setTypes((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n })}
                      className="group flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-[11px] transition hover:bg-accent aria-pressed:bg-accent/70 aria-[pressed=false]:border-dashed aria-[pressed=false]:text-muted-foreground"
                    >
                      <span className={cn("size-[7px] rounded-full border border-transparent group-aria-[pressed=false]:bg-transparent!", typeDot[k], typeBorder[k])} />
                      {TYPE_LABELS[k][lang]}
                    </button>
                  ))}
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <p className="flex items-center justify-between px-5 pt-3 pb-1.5 text-[11px] text-muted-foreground md:px-6 md:pt-5 md:pb-3">
                  <span>{UI.count[lang](list.length)}</span><span className="text-[9px] tracking-[.12em]">{t("results", lang)}</span>
                </p>
                {list.length === 0 && <p className="px-6 text-sm text-muted-foreground">{t("none", lang)}</p>}
                <ul className="divide-y divide-border px-3 pb-4">
                  {list.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(s.id)}
                        onMouseEnter={() => showTip(s)}
                        onMouseLeave={() => tip.current?.remove()}
                        className="grid w-full grid-cols-[58px_minmax(0,1fr)_14px] items-center gap-3 rounded-lg p-2.5 text-left transition hover:bg-muted md:py-3.5"
                      >
                        {s.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.cover} alt="" loading="lazy" className="h-14 w-[58px] rounded-t-[30px] rounded-b-lg border border-border object-cover md:h-[68px]" />
                        ) : (
                          <span className={cn("grid h-14 w-[58px] place-items-center rounded-t-[30px] rounded-b-lg border border-border bg-muted text-[25px] md:h-[68px]", typeText[s.type])}>✝</span>
                        )}
                        <span className="min-w-0">
                          <span className={cn("block text-[9px] tracking-[.07em] uppercase", typeText[s.type])}>{TYPE_LABELS[s.type][lang]}</span>
                          <span className="mt-0.5 mb-1 block font-heading text-sm leading-normal font-medium">{name(s)}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{s.location[lang] || s.location.el}</span>
                        </span>
                        <span aria-hidden className="text-[17px] text-muted-foreground">↗</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </>
          )}
        </aside>
        <div className="relative order-1 min-h-0 min-w-0 overflow-hidden rounded-xl border border-border md:order-2 md:rounded-2xl">
          <div ref={mapEl} className="map3d size-full bg-[linear-gradient(var(--secondary),var(--parchment))]" />
          <div className="pointer-events-none absolute bottom-6 left-2.5 flex max-w-[calc(100%-40px)] items-center gap-2.5 rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-[9px] text-foreground/80 shadow-sm md:bottom-7 md:left-5 md:px-4 md:py-3 md:text-[10px]">
            <span className="size-1.5 flex-none rounded-full bg-primary" />
            <span className="font-semibold">{region.name[lang]}</span>
            <span className="hidden h-3 w-px bg-border lg:block" />
            <span className="hidden text-muted-foreground lg:block">{current ? name(current) : t("hint", lang)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
