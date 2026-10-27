// 3D map style (MapLibre GL) shared by the main map, the site pages and the admin location picker.
import type { GeoJSONSource, IControl, Map as MlMap, StyleSpecification } from "maplibre-gl"

// Map colours, mixed from the site palette (crimson #6b1d1d, gold #ad8840, parchment #ece8de; see globals.css):
// an old-atlas look with parchment land, a gold-tinted sea and the selected region outlined in crimson.
const COLORS = {
  sea: "#d9cfba", island: "#e6e0d2", land: "#f6f3ec", mask: "#ece8de", accent: "#6b1d1d",
  shadow: "#3b1f19", highlight: "#fbf9f4", hillAccent: "#8a6d38",
}
const EMPTY = { type: "FeatureCollection" as const, features: [] }
const WORLD = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]

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
      terrain: DEM,
      hillshade: { ...DEM }, // separate source instance, as recommended for terrain + hillshade
      satellite: {
        type: "raster", tileSize: 256, maxzoom: 19,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      },
      cyprus: { type: "geojson", data: "/data/cyprus.geojson", attribution: "Natural Earth" },
      mask: { type: "geojson", data: EMPTY },
      region: { type: "geojson", data: EMPTY, attribution: "Boundaries © OpenStreetMap contributors" },
    },
    layers: [
      { id: "sea", type: "background", paint: { "background-color": COLORS.sea } },
      { id: "island", type: "fill", source: "cyprus", paint: { "fill-color": COLORS.island } },
      { id: "land", type: "fill", source: "region", paint: { "fill-color": COLORS.land } },
      { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" }, paint: { "raster-saturation": -0.1 } },
      {
        id: "hillshade", type: "hillshade", source: "hillshade",
        paint: {
          "hillshade-exaggeration": 0.55,
          "hillshade-shadow-color": COLORS.shadow,
          "hillshade-highlight-color": COLORS.highlight,
          "hillshade-accent-color": COLORS.hillAccent,
          "hillshade-illumination-direction": 315,
        },
      },
      { id: "mask", type: "fill", source: "mask", paint: { "fill-color": COLORS.mask, "fill-opacity": 0.86 } },
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
const boundaries = (): Promise<Boundaries> => (boundariesPromise ??= fetch("/data/boundaries.geojson").then((r) => r.json()))

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
