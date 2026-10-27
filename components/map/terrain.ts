// 3D map style (MapLibre GL) shared by the main map, the site pages and the admin location picker.
import type { GeoJSONSource, IControl, Map as MlMap, StyleSpecification } from "maplibre-gl"

const COLORS = { sea: "#c4d9dc", island: "#e6e0d2", land: "#f6eedd", mask: "#dfe8e7", accent: "#7b1e2b" }
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
          "hillshade-shadow-color": "#4e3b2c",
          "hillshade-highlight-color": "#fffaf0",
          "hillshade-accent-color": "#8c6f52",
          "hillshade-illumination-direction": 315,
        },
      },
      { id: "mask", type: "fill", source: "mask", paint: { "fill-color": COLORS.mask, "fill-opacity": 0.86 } },
      { id: "region-glow", type: "line", source: "region", paint: { "line-color": COLORS.accent, "line-width": 10, "line-blur": 8, "line-opacity": 0.28 } },
      { id: "region-line", type: "line", source: "region", paint: { "line-color": COLORS.accent, "line-width": 1.6, "line-opacity": 0.8 } },
    ],
    sky: {
      "sky-color": "#bcd6e6",
      "horizon-color": "#f4efe4",
      "fog-color": "#f1ece1",
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

// Map colours per theme (the style is built with the light values).
const THEMES = {
  light: {
    sea: COLORS.sea, island: COLORS.island, land: COLORS.land, mask: COLORS.mask, maskOpacity: 0.86, line: COLORS.accent,
    shadow: "#4e3b2c", highlight: "#fffaf0", accent: "#8c6f52", satelliteBrightness: 1,
    sky: { "sky-color": "#bcd6e6", "horizon-color": "#f4efe4", "fog-color": "#f1ece1" },
  },
  dark: {
    sea: "#1b2729", island: "#252b27", land: "#3a3b2f", mask: "#151d1f", maskOpacity: 0.82, line: "#c9a46a",
    shadow: "#000000", highlight: "#77745c", accent: "#26261d", satelliteBrightness: 0.8,
    sky: { "sky-color": "#18242c", "horizon-color": "#28302a", "fog-color": "#1e251f" },
  },
}

/** Recolours an already loaded map for the light or dark theme. */
export function applyMapTheme(map: MlMap, dark: boolean) {
  if (!map.getLayer("sea")) return
  const t = THEMES[dark ? "dark" : "light"]
  map.setPaintProperty("sea", "background-color", t.sea)
  map.setPaintProperty("island", "fill-color", t.island)
  map.setPaintProperty("land", "fill-color", t.land)
  map.setPaintProperty("mask", "fill-color", t.mask)
  map.setPaintProperty("mask", "fill-opacity", t.maskOpacity)
  map.setPaintProperty("region-line", "line-color", t.line)
  map.setPaintProperty("region-glow", "line-color", t.line)
  map.setPaintProperty("hillshade", "hillshade-shadow-color", t.shadow)
  map.setPaintProperty("hillshade", "hillshade-highlight-color", t.highlight)
  map.setPaintProperty("hillshade", "hillshade-accent-color", t.accent)
  map.setPaintProperty("satellite", "raster-brightness-max", t.satelliteBrightness)
  map.setSky({ ...mapStyle().sky, ...t.sky })
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
