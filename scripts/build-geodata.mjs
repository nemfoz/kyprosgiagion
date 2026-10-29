// Builds the static geodata used by the maps:
//
//   public/data/world.geojson           countries for the home-page world map
//   public/data/occupied.geojson        the area of the Republic of Cyprus under Turkish occupation since 1974
//   public/data/cyprus-districts.geojson the six districts of the Republic of Cyprus (whole, incl. occupied parts)
//
// Sources and licences:
//   - Natural Earth admin-0 countries 1:10m, Greek point-of-view edition (world — simplified to world
//     scale) and the default 1:10m edition ("N. Cyprus", fallback for the occupied area) —
//     https://www.naturalearthdata.com — public domain, no attribution required.
//     The 1:10m data keeps the UN buffer zone (Cyprus U.N. Buffer Zone) and the British Sovereign Base
//     Areas (Akrotiri, Dhekelia) as separate units, so the occupied area excludes both. On the world
//     map they (and "N. Cyprus" in the default edition) are folded into Cyprus.
//   - OpenStreetMap relation 2514541 (the occupied area's line) via Nominatim, clipped to land —
//     © OpenStreetMap contributors, ODbL 1.0. Attribution required.
//   - geoBoundaries gbOpen CYP ADM1 (https://www.geoboundaries.org), derived from OpenStreetMap
//     (Wambacher's boundary export) — © OpenStreetMap contributors, ODbL 1.0. Attribution required.
//
// Run: node scripts/build-geodata.mjs   (re-runnable; downloads are cached in the OS temp dir —
// pass --fresh to download again). Simplification uses mapshaper through npx (not a dependency).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data");
const TMP = join(tmpdir(), "odoiporiko-geodata");
const MAPSHAPER = "mapshaper@0.7.101";
const FRESH = process.argv.includes("--fresh");
const UA = "Odoiporiko geodata builder (https://odoiporiko.com)";

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const SOURCES = {
  // Greek point of view: Cyprus whole (no "N. Cyprus"), Crimea in Ukraine, Kosovo in Serbia.
  neGrc: `${NE}/ne_10m_admin_0_countries_grc.geojson`,
  ne10: `${NE}/ne_10m_admin_0_countries.geojson`,
  osmOccupied:
    "https://nominatim.openstreetmap.org/lookup?osm_ids=R2514541&polygon_geojson=1&format=geojson",
  gbApi: "https://www.geoboundaries.org/api/current/gbOpen/CYP/ADM1/",
  // Used when the API is unreachable (release of 2023-12-12).
  gbFallback:
    "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/CYP/ADM1/geoBoundaries-CYP-ADM1.geojson",
};

// Eastern Orthodox-majority countries (not the Oriental Orthodox Armenia/Ethiopia/Eritrea).
const ORTHODOX = new Set(["GR", "CY", "RU", "UA", "BY", "RS", "ME", "MK", "BG", "RO", "MD", "GE"]);

// Country (ISO 3166-1 alpha-2) → autocephalous Church (ids from lib/editions.ts).
const EDITION_OF = {
  TR: "constantinople", EG: "alexandria", SY: "antioch", LB: "antioch",
  IL: "jerusalem", PS: "jerusalem", JO: "jerusalem", RU: "russia", RS: "serbia",
  RO: "romania", BG: "bulgaria", GE: "georgia", CY: "cyprus", GR: "greece",
  PL: "poland", AL: "albania", CZ: "czech-slovakia", SK: "czech-slovakia",
};

// Marker point per Church: its seat city.
const EDITION_SEATS = {
  constantinople: { lng: 28.95, lat: 41.03 }, // Istanbul (Phanar)
  alexandria: { lng: 29.92, lat: 31.2 },
  antioch: { lng: 36.31, lat: 33.51 }, // Damascus
  jerusalem: { lng: 35.23, lat: 31.78 },
  russia: { lng: 37.62, lat: 55.75 }, // Moscow
  serbia: { lng: 20.46, lat: 44.82 }, // Belgrade
  romania: { lng: 26.1, lat: 44.43 }, // Bucharest
  bulgaria: { lng: 23.32, lat: 42.7 }, // Sofia
  georgia: { lng: 44.79, lat: 41.72 }, // Tbilisi
  cyprus: { lng: 33.36, lat: 35.17 }, // Nicosia
  greece: { lng: 23.73, lat: 37.98 }, // Athens
  poland: { lng: 21.01, lat: 52.23 }, // Warsaw
  albania: { lng: 19.82, lat: 41.33 }, // Tirana
  "czech-slovakia": { lng: 14.42, lat: 50.09 }, // Prague
};

const DISTRICTS = {
  nicosia: { el: "Επαρχία Λευκωσίας", en: "Nicosia District" },
  kyrenia: { el: "Επαρχία Κερύνειας", en: "Kyrenia District" },
  famagusta: { el: "Επαρχία Αμμοχώστου", en: "Famagusta District" },
  larnaca: { el: "Επαρχία Λάρνακας", en: "Larnaca District" },
  limassol: { el: "Επαρχία Λεμεσού", en: "Limassol District" },
  paphos: { el: "Επαρχία Πάφου", en: "Paphos District" },
};

// ---------------------------------------------------------------------------------------------

async function download(name, url) {
  const file = join(TMP, name);
  if (!FRESH && existsSync(file)) return file;
  console.log(`geodata: downloading ${url}`);
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data));

function mapshaper(...args) {
  try {
    execFileSync("npx", ["--yes", `--package=${MAPSHAPER}`, "--", "mapshaper", ...args], { stdio: "pipe" });
  } catch (err) {
    throw new Error(`mapshaper ${args.join(" ")}\n${err.stderr ?? err.message}`);
  }
}

function walk(coords, fn) {
  if (typeof coords[0] === "number") fn(coords);
  else for (const c of coords) walk(c, fn);
}

function bbox(geometry) {
  let [w, s, e, n] = [180, 90, -180, -90];
  walk(geometry.coordinates, ([x, y]) => {
    w = Math.min(w, x); s = Math.min(s, y); e = Math.max(e, x); n = Math.max(n, y);
  });
  return { w, s, e, n };
}

// Planar ring area in square degrees (cos-corrected), enough to rank islands.
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return Math.abs(a / 2) * Math.cos((ring[0][1] * Math.PI) / 180);
}

// Removes a country's small outlying islands (keeps its largest part, so small island states stay).
function dropSmallIslands(feature, minArea) {
  const g = feature.geometry;
  if (g.type !== "MultiPolygon") return;
  const areas = g.coordinates.map((p) => ringArea(p[0]));
  const max = Math.max(...areas);
  const parts = g.coordinates.filter((_, i) => areas[i] >= minArea || areas[i] === max);
  feature.geometry = parts.length === 1 ? { type: "Polygon", coordinates: parts[0] } : { type: "MultiPolygon", coordinates: parts };
}

const r2 = (x) => Math.round(x * 100) / 100;

// Units without a country code of their own, folded into the country around them.
const FOLD = { CYN: "CY", CNM: "CY", ESB: "CY", WSB: "CY", BRT: "KZ", USG: "CU" };

function iso(p) {
  if (p.ADM0_A3 === "TWN") return "TW"; // Natural Earth codes Taiwan as "CN-TW"
  for (const v of [p.ISO_A2, p.ISO_A2_EH]) if (/^[A-Z]{2}$/.test(v ?? "")) return v;
  return p.ADM0_A3;
}

// ---------------------------------------------------------------------------------------------

async function buildWorld() {
  const src = readJson(await download("ne_10m_admin_0_countries_grc.geojson", SOURCES.neGrc));
  const features = [];
  for (const f of src.features) {
    const p = f.properties;
    if (p.ADM0_A3 === "ATA") continue; // Antarctica
    // Northern Cyprus is not a country: its area is part of Cyprus (drawn separately as occupied).
    // At world scale the UN buffer zone and the British base areas are folded into the island too.
    const code = FOLD[p.ADM0_A3] ?? iso(p);
    if (!/^[A-Z]{2}$/.test(code)) continue; // e.g. the Spratly Islands
    const props = { iso: code, name: code === "CY" ? "Cyprus" : p.NAME_EN || p.NAME,
      name_el: code === "CY" ? "Κύπρος" : p.NAME_EL || p.NAME_EN || p.NAME, orthodox: ORTHODOX.has(code) };
    if (EDITION_OF[code]) props.edition = EDITION_OF[code];
    // More detail for Europe, the Middle East and North Africa (where the editions are) than elsewhere.
    // (tol = simplification interval in metres; Russia in between, Siberia needs little detail.)
    const [cx, cy] = [p.LABEL_X, p.LABEL_Y];
    props.near = cx > -25 && cx < 65 && cy > 10 && cy < 72 ? 1 : 0;
    props.tol = code === "RU" ? 7000 : props.near ? 4000 : 20000;
    features.push({ type: "Feature", properties: props, geometry: f.geometry });
  }
  const tmp = join(TMP, "world-in.geojson");
  const out = join(TMP, "world-out.geojson");
  writeJson(tmp, { type: "FeatureCollection", features });
  mapshaper(tmp, "-dissolve", "iso", "copy-fields=name,name_el,orthodox,edition,near,tol",
    "-simplify", "weighted", "variable", "interval=tol", "keep-shapes",
    "-o", "format=geojson", "precision=0.01", out, "force");
  const fc = readJson(out);
  fc.features = fc.features.filter((f) => f.geometry); // micro-states that vanish at 0.01°
  for (const f of fc.features) dropSmallIslands(f, f.properties.near ? 0.004 : 0.05);
  for (const f of fc.features) {
    const { iso: i, name, name_el, orthodox, edition } = f.properties;
    f.properties = { iso: i, name, name_el, orthodox: orthodox === true || orthodox === "true", ...(edition ? { edition } : {}) };
  }
  return { type: "FeatureCollection", editions: EDITION_SEATS, features: fc.features };
}

async function districtsSource() {
  let url = SOURCES.gbFallback;
  try {
    const res = await fetch(SOURCES.gbApi, { headers: { "user-agent": UA } });
    if (res.ok) url = (await res.json()).gjDownloadURL || url;
  } catch {
    // keep the pinned release
  }
  return download("geoBoundaries-CYP-ADM1.geojson", url);
}

// The occupied area: the OSM line of the occupied area (relation 2514541, which extends over the
// territorial waters) clipped to the island's land from the district outlines, so its coastline matches
// cyprus-districts.geojson. Falls back to Natural Earth 1:10m "N. Cyprus" (coarser) if OSM is unreachable.
async function buildOccupied() {
  const out = join(TMP, "occupied-out.geojson");
  let note;
  try {
    const osm = await download("osm-2514541.geojson", SOURCES.osmOccupied);
    if (!readJson(osm).features?.[0]?.geometry) throw new Error("Nominatim: no geometry");
    const land = join(TMP, "cyprus-land.geojson");
    mapshaper(await districtsSource(), "-dissolve", "-o", "format=geojson", land, "force");
    mapshaper(osm, "-clip", land, "-explode", "-filter-slivers", "min-area=0.05km2",
      "-filter", "this.area > 50000", "-dissolve",
      "-simplify", "weighted", "interval=15", "keep-shapes",
      "-o", "format=geojson", "precision=0.0001", out, "force");
    note = "OpenStreetMap relation 2514541 (the occupied area's line), clipped to the island's land (geoBoundaries CYP ADM1). © OpenStreetMap contributors, ODbL 1.0";
  } catch (err) {
    console.warn(`geodata: OSM occupied area unavailable (${err.message}); using Natural Earth 1:10m`);
    const src = readJson(await download("ne_10m_admin_0_countries.geojson", SOURCES.ne10));
    const cyn = src.features.find((f) => f.properties.ADM0_A3 === "CYN");
    if (!cyn) throw new Error("Natural Earth 10m: no N. Cyprus (CYN) feature");
    const tmp = join(TMP, "occupied-in.geojson");
    writeJson(tmp, { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: cyn.geometry }] });
    mapshaper(tmp, "-o", "format=geojson", "precision=0.0001", out, "force");
    note = "Natural Earth 1:10m admin-0 \"N. Cyprus\" (UN buffer zone and Dhekelia excluded), public domain";
  }
  const fc = readJson(out);
  const geometry = (fc.features ? fc.features[0] : fc.geometries[0]).geometry ?? fc.geometries[0];
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: { el: "Κατεχόμενες περιοχές", en: "Occupied areas" }, note },
      geometry,
    }],
  };
}

async function buildDistricts() {
  const file = await districtsSource();
  const out = join(TMP, "districts-out.geojson");
  mapshaper(file, "-simplify", "weighted", "interval=15", "keep-shapes",
    "-filter-slivers", "min-area=0.05km2",
    "-o", "format=geojson", "precision=0.0001", out, "force");
  const fc = readJson(out);
  const features = fc.features.map((f) => {
    const region = String(f.properties.shapeName).toLowerCase();
    if (!DISTRICTS[region]) throw new Error(`geoBoundaries: unknown district ${f.properties.shapeName}`);
    const b = bbox(f.geometry);
    return {
      type: "Feature",
      properties: {
        region,
        name: DISTRICTS[region],
        bounds: [[r2(b.s), r2(b.w)], [r2(b.n), r2(b.e)]],
        note: "geoBoundaries gbOpen CYP ADM1, from OpenStreetMap. © OpenStreetMap contributors, ODbL 1.0",
      },
      geometry: f.geometry,
    };
  });
  const order = Object.keys(DISTRICTS);
  features.sort((a, b) => order.indexOf(a.properties.region) - order.indexOf(b.properties.region));
  if (features.length !== 6) throw new Error(`geoBoundaries: expected 6 districts, got ${features.length}`);
  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------------------------

mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

for (const [name, build, limit] of [
  ["world.geojson", buildWorld, 400],
  ["occupied.geojson", buildOccupied, 150],
  ["cyprus-districts.geojson", buildDistricts, 400],
]) {
  const file = join(OUT, name);
  writeJson(file, await build());
  const kb = Math.round(statSync(file).size / 1024);
  console.log(`geodata: ${name} ${kb} KB${kb > limit ? ` — over the ${limit} KB budget!` : ""}`);
}
