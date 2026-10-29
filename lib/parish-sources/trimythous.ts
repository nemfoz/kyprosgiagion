// Holy Metropolis of Trimythous (imtrimythountos.org.cy, WordPress + Elementor). Each village has a page with its
// parish church (heading + photo carousel) and its chapels («Εξωκκλήσια»); every village page embeds one of the
// Metropolis's own Google My Maps, whose KML export has a pin per church in a folder per village — we match the
// pins to the churches by village and saint's name. Monasteries have pages of their own.
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { absolute, cleanName, finish, fullSize, getText, isPhoto, monotonic, setPin, translit, wpAll, type FetchOpts } from "./util"

const BASE = "https://imtrimythountos.org.cy"
const LABEL = "Ιερά Μητρόπολη Τριμυθούντος"

type WpPage = { id: number; link: string; title: { rendered: string }; content: { rendered: string } }
type Placemark = { name: string; folder: string; lat: number; lng: number; used?: boolean }

// Villages of the see that lie in Nicosia District (the rest are in Larnaca District).
const NICOSIA_DISTRICT = ["Δάλι", "Ποταμιά", "Πέρα Χωριό", "Νήσου", "Αλάμπρα", "Λύμπια (Ολύμπια)", "Σια"]

const MONASTERIES: [RegExp, string][] = [
  [/Σπυρίδων/, "Τρεμετουσιά"],
  [/Μην[άα]/, "Βάβλα"],
  [/Θέκλ/, "Μοσφιλωτή"],
]

/** Latin-ish canonical form for fuzzy comparison of Greek and English spellings. */
function canon(s: string) {
  return translit(monotonic(s))
    .toLowerCase()
    .replace(/ph/g, "f").replace(/c/g, "k").replace(/[yeη]/g, "i").replace(/ou/g, "u").replace(/ai/g, "i").replace(/oi/g, "i")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const STOP = new Set(
  ["ieros", "ierus", "naos", "nauos", "irus", "ieri", "nai", "ixoklisi", "xoklisi", "ixokklisi", "parikklisi", "parikklision", "parikklisio", "ikklisia", "ikklisaki",
    "agiu", "agias", "agion", "agios", "agia", "agii", "osiu", "osion", "tu", "tis", "ton", "kai", "palaia", "palaios", "nia", "nios", "naos",
    "church", "chapel", "chappel", "chuch", "saint", "st", "of", "the", "old", "new", "ag", "and", "ii", "in"],
)
const tokens = (s: string) => canon(s).split(" ").filter((w) => w.length >= 3 && !STOP.has(w))

function sameVillage(village: string, folder: string) {
  const v = canon(village.replace(/^Δήμος\s+/, ""))
  const alts = [folder, ...(folder.match(/\(([^)]+)\)/)?.slice(1) ?? [])].map((f) => canon(f.replace(/\s*\(.*\)/, "")))
  return alts.some((f) => {
    const a = v.split(" ")
    const b = f.split(" ")
    return a.length === b.length && a.every((w, i) => w.slice(0, Math.min(4, w.length)) === b[i].slice(0, Math.min(4, w.length)))
  })
}

/** The pin in the village's folder whose name shares most saint-name words with the church; ties = no match. */
function matchPin(name: string, village: string, pins: Placemark[]): Placemark | undefined {
  const t = tokens(name)
  if (!t.length) return undefined
  const scored = pins
    .filter((p) => !p.used && sameVillage(village, p.folder))
    .map((p) => {
      const pt = tokens(p.name)
      return { p, score: t.filter((w) => pt.some((x) => x.slice(0, 4) === w.slice(0, 4))).length }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  if (!scored.length || (scored[1] && scored[1].score === scored[0].score)) return undefined
  scored[0].p.used = true
  return scored[0].p
}

async function kml(mid: string, opts: FetchOpts): Promise<Placemark[]> {
  const xml = await getText(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`, opts)
  const out: Placemark[] = []
  for (const f of xml.matchAll(/<Folder>([\s\S]*?)<\/Folder>/g)) {
    const folder = cleanName(f[1].match(/<name>([\s\S]*?)<\/name>/)?.[1].replace(/<!\[CDATA\[|\]\]>/g, "") ?? "")
    for (const p of f[1].matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
      const name = cleanName(p[1].match(/<name>([\s\S]*?)<\/name>/)?.[1].replace(/<!\[CDATA\[|\]\]>/g, "") ?? "")
      const c = p[1].match(/<Point>\s*<coordinates>\s*(-?[\d.]+),(-?[\d.]+)/)
      if (c) out.push({ name, folder, lng: +c[1], lat: +c[2] })
    }
  }
  return out
}

/** A village page: parish church(es) from the ElementsKit headings, chapels after the «Εξωκκλήσια» heading. */
function villageRows(page: WpPage): (ImportRow & { _village: string })[] {
  const village = cleanName(page.title.rendered).replace(/^Δήμος\s+/, "").replace(/^‘/, "")
  const place = village.replace(/^Ιδαλίου$/, "Δάλι").replace(/^Αθηαίνου$/, "Αθηένου").replace(/^Λευκάρων$/, "Λεύκαρα")
  const rows: (ImportRow & { _village: string })[] = []
  let chapels = false
  let last: ImportRow | null = null
  for (const chunk of page.content.rendered.split(/(?=<div[^>]*data-widget_type=")/)) {
    const type = chunk.match(/data-widget_type="([^"]+)"/)?.[1] ?? ""
    if (type.startsWith("elementskit-heading")) {
      // Only the title: the description under it lists the priest, chanters and committee — never read it.
      const h = chunk.match(/<h\d[^>]*ekit-heading--(?:subtitle|title)[^>]*>([\s\S]*?)<\/h\d>/)?.[1]
      if (!h) continue
      const name = cleanName(h)
      if (!/Να[οό]|Μονή|Εκκλησ/.test(name)) continue
      last = { name_el: name, location_el: place, source: page.link, _village: village } as ImportRow & { _village: string }
      rows.push(last as ImportRow & { _village: string })
    } else if (type.startsWith("image-carousel") && last && !last.image) {
      const src = chunk.match(/<img[^>]+src="([^"]+)"/)?.[1]
      if (src && isPhoto(src)) last.image = fullSize(absolute(src, BASE))
    } else if (type === "heading.default") {
      const h = cleanName(chunk.match(/elementor-heading-title[^>]*>([\s\S]*?)<\/h\d>/)?.[1] ?? "")
      if (!h) continue
      if (/Ψηφιακοί χάρτες/i.test(h)) break
      if (/^Εξωκκλήσι(α)?$|^Εξωκλήσι(α)?$|^Παρεκκλήσι(α)?$/i.test(h)) {
        chapels = true
        continue
      }
      if (!chapels || h === h.toUpperCase()) continue
      const name = /^(Ιερ|Εξωκ|Παρεκκ|Παλαι)/.test(h) ? h : `Εξωκλήσι ${h}`
      last = null
      rows.push({ name_el: name, type: /^Ιερ/.test(name) ? undefined : "chapel", location_el: place, source: page.link, _village: village })
    }
  }
  return rows
}

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  const log = opts.log ?? (() => {})
  log("imtrimythountos.org.cy: reading pages from the WordPress API…")
  const pages = await wpAll<WpPage>(`${BASE}/wp-json/wp/v2/pages`, "_fields=id,link,title,content", opts)

  const mids = new Set<string>()
  const rows: (ImportRow & { _village?: string })[] = []
  for (const p of pages) {
    const mid = p.content.rendered.match(/google\.[a-z.]+\/maps\/d\/[a-z]+\?mid=([A-Za-z0-9_-]+)/)?.[1]
    if (mid) {
      mids.add(mid)
      rows.push(...villageRows(p))
    } else if (/\/(iera-moni-|iero-isixastirio-)/.test(p.link)) {
      const name = cleanName(p.title.rendered)
      const img = p.content.rendered.match(/<img[^>]+src="([^"]+)"/g)?.map((t) => t.match(/src="([^"]+)"/)![1]).find(isPhoto)
      rows.push({ name_el: name, type: "monastery", location_el: MONASTERIES.find(([re]) => re.test(name))?.[1], source: p.link, image: img ? fullSize(absolute(img, BASE)) : undefined })
    }
  }
  log(`imtrimythountos.org.cy: ${rows.length} churches on ${pages.length} pages; reading ${mids.size} maps…`)

  const pins: Placemark[] = []
  for (const mid of mids) pins.push(...(await kml(mid, opts)))
  let matched = 0
  for (const r of rows) {
    const village = r._village
    delete r._village
    r.region = r.location_el && NICOSIA_DISTRICT.some((v) => sameVillage(r.location_el!, v)) ? "nicosia" : "larnaca"
    if (!village) continue
    const pin = matchPin(r.name_el, village, pins)
    if (pin) {
      setPin(r, { lat: pin.lat, lng: pin.lng, exact: true })
      matched++
    }
  }
  log(`imtrimythountos.org.cy: ${pins.length} map pins, ${matched} matched to a church`)
  return finish(rows, { see: "trimythous", source_label: LABEL })
}

export const trimythous: ParishSource = {
  id: "trimythous",
  see: "trimythous",
  label: { el: "Ιερά Μητρόπολη Τριμυθούντος (imtrimythountos.org.cy)", en: "Metropolis of Trimythous (imtrimythountos.org.cy)" },
  url: `${BASE}/ieroi-naoi-enories/`,
  region: "larnaca",
  note:
    "Parish churches and chapels from the village pages, plus the monasteries. Pins come from the Metropolis's own Google My Maps " +
    "(one per vicariate) and are matched to churches by village and saint's name — check them in the preview; unmatched churches have no pin. " +
    "Only the parish church gets a photo (the chapel sliders are not read). The occupied communities page is not read.",
  fetch: (opts = {}) => fetchAll(opts),
}
