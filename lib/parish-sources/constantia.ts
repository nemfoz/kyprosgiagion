// Holy Metropolis of Constantia–Ammochostos (imconstantias.org.cy). One page («Ιερές Μονές – Ιεροί Ναοί») has a
// tab per parish group (monasteries, the free villages, the occupied parishes); each church/chapel is an image +
// heading, usually with a Google Maps link right under it. Occupied parishes keep their pin on the detail page.
// (Extends scripts/fetch-imconstantias.mjs, which read the occupied tab only.)
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { absolute, cleanName, eachSeq, finish, fullSize, getText, isPhoto, mapLinks, resolveMapLink, setPin, type FetchOpts } from "./util"

const BASE = "https://imconstantias.org.cy"
const LIST_URL = `${BASE}/ieres-mones-ieroi-naoi/`
const LABEL = "Ιερά Μητρόπολη Κωνσταντίας–Αμμοχώστου"
const OFFICE_MAP = /maps\.app\.goo\.gl\/3aPjU1DuutDFjGrp7/ // the Metropolis office, in every page footer

const MONASTERY_PLACE: [RegExp, string][] = [
  [/Αγίας Νάπας/, "Αγία Νάπα"],
  [/Κενδέα/, "Αυγόρου"],
  [/Βαρνάβα/, "Έγκωμη"],
]

type Item = { heading: string; image?: string; href?: string; map?: string }

/** Splits a tab into image + heading (+ map link) items, in page order. */
function items(block: string): Item[] {
  const out: Item[] = []
  let image: string | undefined
  let href: string | undefined
  let current: Item | null = null
  for (const chunk of block.split(/(?=<div[^>]*data-widget_type=")/)) {
    const type = chunk.match(/data-widget_type="([^"]+)"/)?.[1] ?? ""
    if (type.startsWith("image")) {
      const src = chunk.match(/<img[^>]+src="([^"]+)"/)?.[1]
      image = src ? fullSize(absolute(src, BASE)) : undefined
      href = chunk.match(/<a href="(https:\/\/imconstantias\.org\.cy\/[^"#]+)"/)?.[1]
      current = null
    } else if (type.startsWith("heading")) {
      const h = chunk.match(/elementor-heading-title[^>]*>([\s\S]*?)<\/(?:h\d|p|div)>/)?.[1]
      if (!h) continue
      current = { heading: cleanName(h), image, href: href ?? chunk.match(/<a href="(https:\/\/imconstantias\.org\.cy\/[^"#]+)"/)?.[1] }
      image = href = undefined
      out.push(current)
    } else if (type.startsWith("icon-list") && current && !current.map) {
      current.map = mapLinks(chunk).find((u) => !OFFICE_MAP.test(u))
    }
  }
  return out
}

function placeOf(heading: string, tab: string): { name: string; place: string } {
  let name = heading.replace(/^Ι\.\s?Ν\.\s*/, "Ιερός Ναός ").replace(/\.$/, "")
  let place = tab.replace(/^Αγία Ναπα$/, "Αγία Νάπα")
  // "Συνοικισμός Αυγόρου. Ιερός Ναός …", "Γαϊδουράς. Ιερός Ναός …"; "Ρωσσόφωνη ενορία. Παρεκκλήσια …"
  const m = name.match(/^([^.]+)\.\s*(.+)$/)
  if (m && m[1].length > 3 && !/Να[οό]|ενορία|Απ$|Αγ$|Σταυροπ$/i.test(m[1]) && !/^Ι\.\s?Β\./.test(name)) {
    place = m[1].trim().replace(/^Δερύνεια Κάτω$/, "Κάτω Δερύνεια")
    name = m[2].trim()
  } else if (m && /ενορία/i.test(m[1])) name = `${m[2].trim()} (${m[1].trim()})`
  if (/πόλεως Αμμοχώστου/.test(name)) {
    place = "Αμμόχωστος"
    name = name.replace(/\s*πόλεως Αμμοχώστου/, "")
  }
  if (/Βαρωσίων/.test(name)) {
    place = "Κάτω Βαρώσια"
    name = name.replace(/\s*\(Κάτω Βαρωσίων\)/, "")
  }
  if (/εντός των τειχών/.test(name)) place = "Αμμόχωστος"
  return { name: name.replace(/\.$/, ""), place }
}

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  const log = opts.log ?? (() => {})
  log("imconstantias.org.cy: reading the parish page…")
  const page = await getText(LIST_URL, opts)
  const tabs = [...page.matchAll(/aria-controls="([^"]+)"[^>]*>\s*<span class="e-n-tab-title-text">\s*([^<]+?)\s*</g)].map((m) => ({ id: m[1], title: cleanName(m[2]) }))
  if (!tabs.length) throw new Error("No tabs found on imconstantias.org.cy – the page layout may have changed.")
  const starts = tabs.map((t) => page.indexOf(`id="${t.id}"`))
  const footer = page.indexOf("elementor-location-footer")

  const rows: (ImportRow & { _map?: string; _detail?: string })[] = []
  tabs.forEach((tab, i) => {
    const block = page.slice(starts[i], starts[i + 1] > 0 ? starts[i + 1] : footer > 0 ? footer : undefined)
    const monasteries = /Μονές/.test(tab.title)
    const occupied = /Κατεχόμενες/.test(tab.title)
    for (const it of items(block)) {
      if (/^Ιερά Μητρόπολις|περισσότερα/i.test(it.heading)) continue
      let { name, place } = placeOf(it.heading, tab.title)
      if (monasteries) {
        name = name.replace(/^Ι\.\s?Β\.\s?&\s?Σταυροπ\.\s?Μονή/, "Ιερά Βασιλική και Σταυροπηγιακή Μονή")
        place = MONASTERY_PLACE.find(([re]) => re.test(name))?.[1] ?? ""
      }
      const formal = /^(Ιερ[όά]ς?|Ιερά|Ιεροί|Μητροπολιτικός|Καθεδρικός|Παλαιός|Ι\.)/.test(name)
      rows.push({
        name_el: name,
        type: monasteries ? "monastery" : !formal ? "chapel" : undefined,
        location_el: occupied && place === tab.title ? undefined : place,
        image: isPhoto(it.image) ? it.image : undefined,
        source: it.href ?? LIST_URL,
        _map: it.map,
        _detail: occupied && !it.map ? it.href : undefined,
      })
    }
  })
  log(`imconstantias.org.cy: ${rows.length} entries; resolving map links…`)

  let n = 0
  await eachSeq(rows, async (r) => {
    let link = r._map
    if (!link && r._detail) {
      const html = await getText(r._detail, opts).catch(() => "")
      link = mapLinks(html).find((u) => !OFFICE_MAP.test(u) && /goo\.gl/.test(u))
    }
    if (link) setPin(r, await resolveMapLink(link, opts), link)
    if (++n % 25 === 0) log(`  ${n}/${rows.length}`)
    delete r._map
    delete r._detail
  }, opts.signal)

  return finish(rows, { see: "constantia-ammochostos", region: "famagusta", source_label: LABEL })
}

export const constantia: ParishSource = {
  id: "constantia",
  see: "constantia-ammochostos",
  label: { el: "Ιερά Μητρόπολη Κωνσταντίας–Αμμοχώστου (imconstantias.org.cy)", en: "Metropolis of Constantia–Ammochostos (imconstantias.org.cy)" },
  url: LIST_URL,
  region: "famagusta",
  note:
    "Every tab of «Ιερές Μονές – Ιεροί Ναοί»: monasteries, the parishes of the free villages with their chapels, and the occupied parishes. " +
    "Pins come from the Google Maps link under each entry (occupied parishes: from their own page). Chapel names are as the site gives them (e.g. «Άγιος Γεώργιος»), converted to monotonic.",
  fetch: (opts = {}) => fetchAll(opts),
}
