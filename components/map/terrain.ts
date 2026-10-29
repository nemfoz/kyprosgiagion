// 3D map style (MapLibre GL) shared by the main map, the site pages and the admin location picker.
import type { GeoJSONSource, IControl, Map as MlMap, StyleSpecification } from "maplibre-gl"
import type { SiteType } from "@/lib/content"

// Map colours, mixed from the site palette (crimson #6b1d1d, gold #ad8840, parchment #ece8de; see globals.css):
// an old-atlas look with parchment land, a gold-tinted sea and the selected region outlined in crimson.
// The areas of Cyprus under occupation are always tinted crimson, also where the rest is faded.
const COLORS = {
  sea: "#d9cfba", island: "#e6e0d2", land: "#f6f3ec", mask: "#ece8de", accent: "#6b1d1d",
  shadow: "#3b1f19", highlight: "#fbf9f4", hillAccent: "#8a6d38",
}
const EMPTY = { type: "FeatureCollection" as const, features: [] }
const WORLD = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]

// Never draw the map at more than this many device pixels per CSS pixel: Retina screens would otherwise render
// 4× the pixels (terrain, hill shading and fog on every frame) for little visible difference.
export const PIXEL_RATIO = () => Math.min(window.devicePixelRatio || 1, 1.5)

// Mapterhorn: open terrain tiles (sea level = 0, so the sea stays flat in 3D).
const DEM = {
  type: "raster-dem" as const,
  tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"],
  encoding: "terrarium" as const,
  tileSize: 512,
  maxzoom: 12,
  attribution: '<a href="https://mapterhorn.com/attribution" target="_blank">© Mapterhorn</a>',
}

export function mapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      // One source for both 3D terrain and hill shading: each elevation tile is downloaded and decoded once.
      terrain: DEM,
      satellite: {
        type: "raster", tileSize: 256, maxzoom: 19,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      },
      world: { type: "geojson", data: "/data/world.geojson", attribution: "Natural Earth" },
      cyprus: { type: "geojson", data: "/data/cyprus.geojson" },
      occupied: { type: "geojson", data: "/data/occupied.geojson" },
      mask: { type: "geojson", data: EMPTY },
      region: { type: "geojson", data: EMPTY, attribution: "Boundaries © OpenStreetMap contributors" },
    },
    layers: [
      { id: "sea", type: "background", paint: { "background-color": COLORS.sea } },
      { id: "world", type: "fill", source: "world", paint: { "fill-color": COLORS.island } },
      { id: "island", type: "fill", source: "cyprus", paint: { "fill-color": COLORS.island } },
      { id: "land", type: "fill", source: "region", paint: { "fill-color": COLORS.land } },
      { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" }, paint: { "raster-saturation": -0.1 } },
      {
        id: "hillshade", type: "hillshade", source: "terrain",
        paint: {
          "hillshade-exaggeration": 0.55,
          "hillshade-shadow-color": COLORS.shadow,
          "hillshade-highlight-color": COLORS.highlight,
          "hillshade-accent-color": COLORS.hillAccent,
          "hillshade-illumination-direction": 315,
        },
      },
      { id: "mask", type: "fill", source: "mask", paint: { "fill-color": COLORS.mask, "fill-opacity": 0.86 } },
      { id: "occupied", type: "fill", source: "occupied", paint: { "fill-color": COLORS.accent, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.2, 12, 0.1] } },
      { id: "occupied-line", type: "line", source: "occupied", paint: { "line-color": COLORS.accent, "line-width": 1.2, "line-opacity": 0.7, "line-dasharray": [3, 2] } },
      { id: "region-glow", type: "line", source: "region", paint: { "line-color": COLORS.accent, "line-width": 10, "line-blur": 8, "line-opacity": 0.28 } },
      { id: "region-line", type: "line", source: "region", paint: { "line-color": COLORS.accent, "line-width": 1.6, "line-opacity": 0.8 } },
    ],
    sky: {
      "sky-color": "#e2dac8",
      "horizon-color": COLORS.mask,
      "fog-color": COLORS.mask,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.7,
      "fog-ground-blend": 0.8,
      "atmosphere-blend": 0.6,
    },
  }
}

type Boundaries = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { region: string }>
let boundariesPromise: Promise<Boundaries> | undefined
const boundaries = (): Promise<Boundaries> => (boundariesPromise ??= fetch("/api/boundaries").then((r) => r.json()))

/** Highlights one region: its land is drawn warm and outlined, everything outside is faded. */
export async function setRegion(map: MlMap, boundaryId?: string) {
  const fc = await boundaries()
  const feature = fc.features.find((f) => f.properties.region === boundaryId)
  const polys = !feature ? [] : feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates
  const region = map.getSource("region") as GeoJSONSource | undefined
  const mask = map.getSource("mask") as GeoJSONSource | undefined
  region?.setData(feature ?? EMPTY)
  mask?.setData(!feature ? EMPTY : {
    type: "Feature", properties: {},
    geometry: { type: "Polygon", coordinates: [WORLD, ...polys.map((p) => p[0])] },
  })
}

export function setTerrain(map: MlMap, on: boolean, exaggeration = 1.8) {
  map.setTerrain(on ? { source: "terrain", exaggeration } : null)
}

export function setSatellite(map: MlMap, on: boolean) {
  map.setLayoutProperty("satellite", "visibility", on ? "visible" : "none")
  map.setPaintProperty("hillshade", "hillshade-exaggeration", on ? 0.25 : 0.55)
}

export function pinElement(type: string, { approx = false } = {}) {
  const el = document.createElement("div")
  el.className = `pin pin-${type}${approx ? " pin-approx" : ""}`
  el.innerHTML = "<span></span>"
  return el
}

export const collapseAttribution = (map: MlMap) =>
  map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show")

/** Map control with text buttons (3D/2D, Map/Satellite). */
export class ButtonsControl implements IControl {
  private el?: HTMLDivElement
  constructor(private buttons: { label: () => string; onClick: () => void }[]) {}
  onAdd() {
    this.el = document.createElement("div")
    this.el.className = "maplibregl-ctrl maplibregl-ctrl-group ka-ctrl"
    for (const b of this.buttons) {
      const btn = Object.assign(document.createElement("button"), { type: "button", className: "ka-ctrl-btn", textContent: b.label() })
      btn.addEventListener("click", () => { b.onClick(); btn.textContent = b.label() })
      this.el.append(btn)
    }
    return this.el
  }
  refresh() {
    this.el?.querySelectorAll("button").forEach((btn, i) => (btn.textContent = this.buttons[i].label()))
  }
  onRemove() { this.el?.remove() }
}

// ---- churches, clusters and place names, drawn by the map itself ----
// (HTML markers would each read the terrain depth back from the GPU while the map moves in 3D, which stalls it.)

// The site palette resolved to plain colours (canvas can't read the CSS color-mix() tokens).
const PIN = {
  church: "#6b1d1d", monastery: "#2b0707", chapel: "#ad8840", basilica: "#5f4a20",
  card: "#f6f5f0", ink: "#160202", muted: "#553f3b", crimson: "#6b1d1d", gold: "#ad8840", parchment: "#ece8de",
}
const RATIO = 2

function canvas(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w * RATIO
  c.height = h * RATIO
  const ctx = c.getContext("2d")!
  ctx.scale(RATIO, RATIO)
  return { c, ctx }
}
const image = (ctx: CanvasRenderingContext2D) => ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
const cssFont = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "sans-serif"

/** A church pin: a teardrop in the type's colour with a cross, dashed when the location is approximate. */
function pinImage(type: SiteType, approx: boolean) {
  const { ctx } = canvas(36, 44)
  const r = 14, cx = 18, cy = 17
  ctx.beginPath()
  ctx.arc(cx, cy, r, (3 * Math.PI) / 4, Math.PI / 4)
  ctx.lineTo(cx, cy + r * Math.SQRT2)
  ctx.closePath()
  ctx.shadowColor = "rgba(22, 2, 2, .22)"
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 2
  ctx.fillStyle = PIN[type]
  ctx.fill()
  ctx.shadowColor = "transparent"
  ctx.lineWidth = 2
  ctx.strokeStyle = PIN.card
  if (approx) ctx.setLineDash([3, 2.5])
  ctx.stroke()
  ctx.fillStyle = PIN.card
  ctx.font = `15px ${cssFont("--font-ui")}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("✝", cx, cy + 1)
  return image(ctx)
}

/** A numbered circle standing for several churches close together. */
function clusterImage(count: number) {
  const size = count >= 10 ? 44 : 36, pad = 6, full = size + pad * 2, c = full / 2
  const { ctx } = canvas(full, full)
  ctx.beginPath()
  ctx.arc(c, c, size / 2 + 3, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(173, 136, 64, .7)"
  ctx.shadowColor = "rgba(22, 2, 2, .3)"
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  ctx.fill()
  ctx.shadowColor = "transparent"
  ctx.beginPath()
  ctx.arc(c, c, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = PIN.card
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c, c, size / 2 - 2, 0, Math.PI * 2)
  ctx.fillStyle = PIN.crimson
  ctx.fill()
  ctx.fillStyle = PIN.parchment
  ctx.font = `700 ${count >= 10 ? 15 : 14}px ${cssFont("--font-ui")}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(String(count), c, c + 1)
  return image(ctx)
}

/** A place name with a light halo, like the old HTML labels. */
function labelImage(text: string, major: boolean) {
  const font = major ? `700 14px ${cssFont("--font-display")}` : `600 12px ${cssFont("--font-ui")}`
  const probe = canvas(1, 1).ctx
  probe.font = font
  const w = Math.ceil(probe.measureText(text).width) + 10, h = major ? 22 : 19
  const { ctx } = canvas(w, h)
  ctx.font = font
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.lineJoin = "round"
  ctx.lineWidth = 4
  ctx.strokeStyle = PIN.card
  ctx.strokeText(text, w / 2, h / 2)
  ctx.fillStyle = major ? PIN.ink : PIN.muted
  ctx.fillText(text, w / 2, h / 2)
  return image(ctx)
}

export type PlacePoint = { lng: number; lat: number; text: string; major: boolean }

/** Image ids are made on demand (the map asks for any it doesn't have yet). */
function addImageFor(map: MlMap, id: string) {
  const [kind, ...rest] = id.split(":")
  const data = kind === "pin" ? pinImage(rest[0] as SiteType, rest[1] === "approx")
    : kind === "cluster" ? clusterImage(Number(rest[0]))
    : kind === "label" ? labelImage(rest.slice(1).join(":"), rest[0] === "major")
    : null
  if (data && !map.hasImage(id)) map.addImage(id, data, { pixelRatio: RATIO })
}

const collection = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features })

/**
 * Sources and layers for the explorer: place names (hidden where a pin or cluster covers them), "near me",
 * clustered church pins (up to zoom 13) and the selected church on top, never clustered.
 */
export function addSiteLayers(map: MlMap) {
  map.on("styleimagemissing", (e) => addImageFor(map, e.id))
  map.addSource("places", { type: "geojson", data: EMPTY })
  map.addSource("me", { type: "geojson", data: EMPTY })
  map.addSource("sites", { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 42, clusterMaxZoom: 13 })
  map.addSource("selected", { type: "geojson", data: EMPTY })
  const label = (id: string, major: boolean, minzoom = 0) => map.addLayer({
    id, type: "symbol", source: "places", minzoom, filter: ["==", ["get", "major"], major],
    layout: { "icon-image": ["get", "image"], "icon-anchor": "top", "icon-offset": [0, 4], "icon-padding": 0 },
  })
  label("places-minor", false, 10.3)
  label("places-major", true)
  map.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 16, "circle-color": PIN.crimson, "circle-opacity": 0.18, "circle-pitch-alignment": "map" } })
  map.addLayer({ id: "me-dot", type: "circle", source: "me", paint: { "circle-radius": 7, "circle-color": PIN.crimson, "circle-stroke-width": 3, "circle-stroke-color": PIN.card } })
  map.addLayer({
    id: "clusters", type: "symbol", source: "sites", filter: ["has", "point_count"],
    layout: { "icon-image": ["concat", "cluster:", ["get", "point_count"]], "icon-allow-overlap": true },
  })
  const pins = (id: string, source: string, size: number) => map.addLayer({
    id, type: "symbol", source, filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["concat", "pin:", ["get", "type"], ["case", ["get", "approx"], ":approx", ""]],
      "icon-anchor": "bottom", "icon-size": size, "icon-allow-overlap": true,
    },
  })
  pins("pins", "sites", 1)
  pins("pin-selected", "selected", 1.3)
}

export const PIN_LAYERS = ["pin-selected", "pins", "clusters"]

type SitePoint = { id: number; type: SiteType; lng: number; lat: number; approx: boolean }
const point = (s: SitePoint): GeoJSON.Feature => ({
  type: "Feature", properties: { id: s.id, type: s.type, approx: s.approx }, geometry: { type: "Point", coordinates: [s.lng, s.lat] },
})

export function setSitePoints(map: MlMap, sites: SitePoint[], selected: SitePoint | null) {
  ;(map.getSource("sites") as GeoJSONSource | undefined)?.setData(collection(sites.map(point)))
  ;(map.getSource("selected") as GeoJSONSource | undefined)?.setData(collection(selected ? [point(selected)] : []))
}

/** Place names in the current language; their images are drawn first so they appear at once. */
export async function setPlaces(map: MlMap, places: PlacePoint[]) {
  await document.fonts.ready
  const features = places.map((p) => {
    const image = `label:${p.major ? "major" : "minor"}:${p.text}`
    addImageFor(map, image)
    return { type: "Feature" as const, properties: { image, major: p.major }, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] } }
  })
  ;(map.getSource("places") as GeoJSONSource | undefined)?.setData(collection(features))
}

export function setMe(map: MlMap, at: { lat: number; lng: number } | null) {
  ;(map.getSource("me") as GeoJSONSource | undefined)?.setData(collection(at ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [at.lng, at.lat] } }] : []))
}

