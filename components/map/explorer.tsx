"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import type { Map as MlMap, Marker, Popup } from "maplibre-gl"
import { ArrowLeft, ArrowRight, CalendarDays, Landmark, LayoutDashboard, LogIn, MapPin, Search, Sparkles, TriangleAlert } from "lucide-react"
import { NameDayBar, type NameDays } from "@/components/namedays/nameday-bar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SITE_TYPES, TYPE_LABELS, type Lang, type SiteType } from "@/lib/content"
import { useT } from "@/components/i18n-provider"
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
  /** Page completeness; null for visitors who aren't signed in. */
  percent: number | null
  metropolisId: number | null
  name: Record<Lang, string>
  location: Record<Lang, string>
  summary: Record<Lang, string>
}

type Props = {
  sites: MapSite[]
  initialLang: Lang
  initialRegion: string
  initialMetropolis?: string
  /** Metropolises that have churches on the map. */
  metropolises: { id: number; slug: string; name: Record<Lang, string> }[]
  initialSlug?: string
  account: { name: string } | null
  nameDays: Record<Lang, NameDays>
}

// Active regions, parents first with their sub-regions after them; "all" (the whole island) when there are
// several top-level regions.
const ALL: Region = { id: "all", name: { el: "Όλη η Κύπρος", en: "All of Cyprus" }, bounds: [[34.55, 32.25], [35.72, 34.62]], active: true }
const active = allRegions.filter((r) => r.active)
const tops = active.filter((r) => !r.parent || !active.some((p) => p.id === r.parent))
const regions = [
  ...(tops.length > 1 ? [ALL] : []),
  ...tops.flatMap((r) => [r, ...active.filter((c) => c.parent === r.id)]),
]
const fold = (s: string) => s.toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Camera for a region; `fit` frames a set of pins exactly (no extra zoom, more padding). */
function regionCamera(map: MlMap, r: Region, is3d: boolean, fit = false) {
  const [[s, w], [n, e]] = r.bounds
  const bearing = is3d ? r.camera?.bearing ?? 0 : 0
  const cam = map.cameraForBounds([[w, s], [e, n]], { bearing, padding: fit ? 70 : 30 })
  const wide = map.getContainer().clientWidth > 700
  const extra = fit || !is3d ? 0 : wide ? 0.35 : -0.1
  return { ...cam, bearing, pitch: is3d ? r.camera?.pitch ?? 50 : 0, zoom: (cam?.zoom ?? 8) + extra }
}

export function Explorer({ sites, initialLang, initialRegion, initialMetropolis, metropolises, initialSlug, account, nameDays }: Props) {
  const t = useT()
  const [lang, setLang] = useState<Lang>(initialLang)
  const [regionId, setRegionId] = useState(initialRegion)
  const [metroId, setMetroId] = useState<number | null>(() => metropolises.find((m) => m.slug === initialMetropolis)?.id ?? null)
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
      (regionId === ALL.id || s.regions.includes(regionId)) && (metroId === null || s.metropolisId === metroId) && types.has(s.type) &&
      (!q || fold([s.name.el, s.name.en, s.location.el, s.location.en].join(" ")).includes(q)))
  }, [sitesWithRegions, regionId, metroId, types, query])
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
      const L = { "3d": { el: ["3D", "2D"], en: ["3D", "2D"] }, sat: { el: [t("satellite", "el"), t("map", "el")], en: [t("satellite", "en"), t("map", "en")] } }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; t only changes with the text overrides
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
    setRegion(map, region.boundary)
    if (firstFly.current && selected) { firstFly.current = false; return } // deep link: fly to the site instead
    firstFly.current = false
    map.flyTo({ ...regionCamera(map, area(), view.current.is3d, metroId !== null), duration: 2200, essential: true, curve: 1.2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the region or Metropolis changes
  }, [regionId, metroId, ready])

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
      else map.easeTo({ ...regionCamera(map, area(), view.current.is3d, metroId !== null), duration: 900 })
    }
    const onClick = () => { if (selected) back() }
    window.addEventListener("ka:view", onView)
    map.on("click", onClick)
    return () => { window.removeEventListener("ka:view", onView); map.off("click", onClick) }
  })

  function back() {
    setSelected(null)
    const map = mapRef.current
    if (map) map.flyTo({ ...regionCamera(map, area(), view.current.is3d, metroId !== null), duration: 1500 })
  }

  // ---- URL ----
  useEffect(() => {
    const p = new URLSearchParams()
    if (lang !== "el") p.set("lang", lang)
    if (regionId !== defaultRegion) p.set("region", regionId)
    const metro = metropolises.find((m) => m.id === metroId)
    if (metro) p.set("metropolis", metro.slug)
    if (current) p.set("site", current.slug)
    history.replaceState(null, "", `${location.pathname}${p.size ? `?${p}` : ""}`)
    document.documentElement.lang = lang
    document.title = siteTitle[lang]
  }, [lang, regionId, metroId, metropolises, current])

  const list = [...visible].sort((a, b) => name(a).localeCompare(name(b), lang))
  const siteHref = (s: MapSite) => `/site/${encodeURIComponent(s.slug)}${lang === "en" ? "?lang=en" : ""}`

  return (
    <div className="flex h-dvh flex-col bg-background">
      <NameDayBar days={nameDays[lang]} lang={lang} />
      <header className="z-10 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 md:gap-x-7 border-b bg-card px-4 py-3 md:h-22 md:flex-nowrap md:px-7 md:py-0">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <span aria-hidden className="grid h-9 w-8 flex-none place-items-center rounded-t-[22px] rounded-b-[7px] border border-border bg-accent text-[22px] text-primary md:h-12 md:w-[42px] md:text-[26px]">☦</span>
          <span className="grid min-w-0 gap-1 md:gap-2">
            <span className="truncate font-heading text-base leading-none font-bold whitespace-nowrap md:text-xl">{siteTitle[lang]}</span>
            <span className="truncate text-[9px] tracking-wide text-muted-foreground md:text-[11px]">{t("caption", lang)}</span>
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {([
            ["/metropolis", "navMetropolises", <Landmark key="m" />],
            ["/eortologio", "navNameDays", <CalendarDays key="n" />],
            ["/contribute", "contribute", <Sparkles key="c" />],
          ] as const).map(([href, key, icon]) => (
            <Button key={href} variant="ghost" size="sm" asChild>
              <Link href={`${href}${lang === "en" ? "?lang=en" : ""}`} aria-label={t(key, lang)}>{icon}<span className="hidden xl:inline">{t(key, lang)}</span></Link>
            </Button>
          ))}
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
                  {current.percent !== null && current.percent < 100 && (
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
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                  {regions.length > 1 && (
                    <Select value={regionId} onValueChange={(r) => { setRegionId(r); setSelected(null) }}>
                      <SelectTrigger size="sm" className="w-full min-w-0 text-xs" aria-label={t("filterRegion", lang)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.id} value={r.id} className={cn("text-xs", r.parent && "pl-6")}>{r.name[lang]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {metropolises.length > 0 && (
                    <Select value={String(metroId ?? "all")} onValueChange={(m) => { setMetroId(m === "all" ? null : Number(m)); setSelected(null) }}>
                      <SelectTrigger size="sm" className={cn("w-full min-w-0 text-xs", regions.length <= 1 && "sm:col-span-2 md:col-span-1")} aria-label={t("filterMetropolis", lang)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">{t("allMetropolises", lang)}</SelectItem>
                        {metropolises.map((m) => <SelectItem key={m.id} value={String(m.id)} className="text-xs">{m.name[lang] || m.name.el}</SelectItem>)}
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
                  <span>{t(list.length === 1 ? "countOne" : "countMany", lang, { n: list.length })}</span><span className="text-[9px] tracking-[.12em]">{t("results", lang)}</span>
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
            <span className="font-semibold">{metropolises.find((m) => m.id === metroId)?.name[lang] || region.name[lang]}</span>
            <span className="hidden h-3 w-px bg-border lg:block" />
            <span className="hidden text-muted-foreground lg:block">{current ? name(current) : t("hint", lang)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
