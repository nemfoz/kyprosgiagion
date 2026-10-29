// Holy Metropolis of Limassol + Bishopric of Amathus (iml.cy). The section «Ιεροί Ναοί, Μονές, Προσκυνήματα»
// lists every church as a card (name with the village in brackets, category, photo) — two list pages give
// them all. The church pages carry no map pin of their own (only the Metropolis office in the footer).
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { cleanName, finish, fullSize, getText, isPhoto, type FetchOpts } from "./util"

const BASE = "https://iml.cy"
const LISTS = [
  { url: `${BASE}/article_category/iera-mitropoli-lemesoy/ieroi-naoi-mones-proskynimata/`, see: "limassol", label: "Ιερά Μητρόπολη Λεμεσού" },
  { url: `${BASE}/article_category/iera-episkopi-amathoyntos/ieroi-naoi-amp-amp-proskynimata/`, see: "amathus", label: "Ιερά Επισκοπή Αμαθούντος" },
]

// Words in brackets that aren't places.
const NOT_A_PLACE = /^(Πολιούχος|Ρωσόφωνος|Παλαιά Μητρόπολις|των Γάτων|Μητροπολιτικού Οίκου|Κατασκηνωτικού χώρου|Γενικό Νοσοκομείο Λεμεσού|Προσφυγικός Ναός.*)$/

function split(title: string, category: string): { name: string; place?: string } {
  const m = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/)
  const city = /Ενορίες Πόλεως|Προσκυνηματικοί|Θρονικά|Προσφυγικοί Συνοικισμοί/.test(category)
  if (m) {
    const inner = m[2].replace(/^Συνοικισμ(ός|ού)\s+/, "Συνοικισμός ")
    if (!NOT_A_PLACE.test(inner)) return { name: m[1], place: inner }
    return { name: title.replace(/\s*\((Πολιούχος|Ρωσόφωνος|των Γάτων)\)/, " ($1)").trim(), place: city ? "Λεμεσός" : undefined }
  }
  return { name: title, place: city ? "Λεμεσός" : undefined }
}

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  const rows: ImportRow[] = []
  for (const list of LISTS) {
    opts.log?.(`iml.cy: reading ${list.label}…`)
    const html = await getText(list.url, opts)
    for (const m of html.matchAll(/<a href="(https:\/\/iml\.cy\/article\/[^"]+)" class="grid-item">([\s\S]*?)<\/a>/g)) {
      const card = m[2]
      const title = cleanName(card.match(/class="card-paragraph">([\s\S]*?)<\/p>/)?.[1] ?? "")
      const category = cleanName(card.match(/class="card-title">([\s\S]*?)<\/div>/)?.[1] ?? "")
      const img = card.match(/<img[^>]+src="([^"]+)"/)?.[1]
      const { name, place } = split(title, category)
      rows.push({
        name_el: name,
        type: /Μονές/.test(category) ? "monastery" : /Παρεκκλήσια/.test(category) ? "chapel" : undefined,
        location_el: place,
        see: list.see,
        region: "limassol",
        image: isPhoto(img) ? fullSize(img) : undefined,
        source: m[1],
        source_label: list.label,
      })
    }
  }
  return finish(rows, {})
}

export const limassol: ParishSource = {
  id: "limassol",
  see: "limassol",
  label: { el: "Ιερά Μητρόπολη Λεμεσού & Επισκοπή Αμαθούντος (iml.cy)", en: "Metropolis of Limassol & Bishopric of Amathus (iml.cy)" },
  url: LISTS[0].url,
  region: "limassol",
  note:
    "Churches, monasteries and chapels from the two list pages of iml.cy (Limassol and the Bishopric of Amathus, which get their own see). " +
    "The site has no map pins for the churches, so no row has coordinates. Town parishes get their quarter as written in the name (often in the genitive) or “Λεμεσός”.",
  fetch: (opts = {}) => fetchAll(opts),
}
