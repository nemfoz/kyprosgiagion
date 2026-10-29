// Holy Metropolis of Paphos + Bishopric of Arsinoe (impaphou.org, WordPress). Every church, chapel and
// monastery has its own page under /ieroi-naoi/… and /ieres-mones/…; the WordPress REST API gives them all
// in a few requests (titles "Ιερός Ναός Αγίου Νικολάου (Νατά)", chapels as child pages of their parish).
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { absolute, cleanName, coordsFromMapUrl, finish, fold, fullSize, getJson, greekTitleCase, isPhoto, mapLinks, setPin, wpAll, type FetchOpts } from "./util"

const BASE = "https://impaphou.org"
const LABEL = "Ιερά Μητρόπολη Πάφου"
const LABEL_ARSINOE = "Ιερά Επισκοπή Αρσινόης"

type WpPage = { id: number; link: string; parent: number; title: { rendered: string }; content: { rendered: string }; featured_media: number }

// Villages of the see that lie in Limassol District (the Metropolis reaches east of the Paphos District line).
const LIMASSOL_DISTRICT = new Set(
  [
    "Πάχνα", "Άνω Πάχνα", "Κάτω Πάχνα", "Ανώγυρα", "Αυδήμου", "Πραστειό Αυδήμου", "Παραμάλι", "Άγιος Θωμάς", "Αλέκτορα",
    "Πλατανίσκια", "Πλατανίστεια", "Άγιος Αμβρόσιος", "Κισσούσα", "Μαλιά", "Μαλλιά", "Δορά", "Άρσος", "Όμοδος", "Μανδριά",
    "Ποταμιού", "Βάσα Κοιλανίου", "Πισσούρι", "Πλάτρες", "Κάτω Πλάτρες", "Πάνω Πλάτρες", "Φοινί", "Τροοδίτισσα", "Πρόδρομος",
    "Λεμύθου", "Γεροβάσα",
  ].map(fold),
)

// Words in brackets that describe the building rather than name the village.
const NOT_A_PLACE = /χαλάσματα|κοιμητ|νοσοκομ|τζαμί|ερείπια|παλαιός|παλαιό |νέο |μνημείο/i

// Quarters of Paphos town written after the name without brackets ("… Αγίου Γεωργίου Αναβαργός").
const QUARTERS: [RegExp, string][] = [
  [/\s+Αναβαργός$/, "Αναβαργός"],
  [/\s+Μουττάλου$/, "Μούτταλος"],
  [/\s+Κάτω Πάφου?ς?$/, "Κάτω Πάφος"],
  [/\s+Κάτω Περβολιών$/, "Πάφος"],
  [/\s+Αγριδιών$/, "Πάφος"],
  [/\s+Γεροσκήπου$/, "Γεροσκήπου"],
]

/** "Ιερός Ναός Αγίου Νικολάου (Νατά)" → name + village. */
function split(title: string): { name: string; place?: string } {
  const m = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/)
  if (m && !NOT_A_PLACE.test(m[2])) return { name: m[1], place: m[2] }
  for (const [re, place] of QUARTERS) if (re.test(title)) return { name: title.replace(re, ""), place }
  return { name: title }
}

const isList = (title: string) => /^Ιερο[ίι] Να[οό][ίι]|^Λειτουργούσες|^Διαλυμένες|^Σπήλαια|^Ιερές Μονές/i.test(title)

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  const log = opts.log ?? (() => {})
  log("impaphou.org: reading pages from the WordPress API…")
  const pages = await wpAll<WpPage>(`${BASE}/wp-json/wp/v2/pages`, "_fields=id,link,parent,title,content,featured_media", opts)
  const byId = new Map(pages.map((p) => [p.id, p]))
  const path = (p: WpPage) => decodeURIComponent(new URL(p.link).pathname).split("/").filter(Boolean)

  // Featured images (one request per 100 ids). An image used by several pages is a placeholder.
  const wanted = pages.filter((p) => /^(ieroi-naoi|ieres-mones)$/.test(path(p)[0] ?? "") && p.featured_media)
  const uses = new Map<number, number>()
  for (const p of wanted) uses.set(p.featured_media, (uses.get(p.featured_media) ?? 0) + 1)
  const ids = [...uses.keys()].filter((id) => uses.get(id) === 1)
  const media = new Map<number, string>()
  for (let i = 0; i < ids.length; i += 100) {
    const batch = await getJson<{ id: number; source_url: string }[]>(
      `${BASE}/wp-json/wp/v2/media?per_page=100&include=${ids.slice(i, i + 100).join(",")}&_fields=id,source_url`,
      opts,
    )
    for (const m of batch) media.set(m.id, m.source_url)
  }
  log(`impaphou.org: ${media.size} photos found`)

  const firstPhoto = (html: string) => {
    for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      const src = absolute(m[1], BASE)
      if (/\/wp-content\/uploads\//.test(src) && isPhoto(src)) return fullSize(src)
    }
    return undefined
  }

  const rows: ImportRow[] = []
  for (const p of pages) {
    const parts = path(p)
    const title = greekTitleCase(cleanName(p.title.rendered))
    if (isList(title)) continue
    const photo = media.get(p.featured_media) ?? firstPhoto(p.content.rendered)
    const image = isPhoto(photo) ? photo : undefined
    const html = p.content.rendered
    const pin = mapLinks(html)
      .map((u) => ({ u, pin: coordsFromMapUrl(u) }))
      .find((x) => x.pin && !/Bishopric|Museum|Μουσείο|Μητρόπολ/i.test(decodeURIComponent(x.u)))

    if (parts[0] === "ieroi-naoi" && parts.length >= 3) {
      const see = parts[1] === "ieroi-naoi-episkopis-arsinois" ? "arsinoe" : "paphos"
      const { name } = split(title)
      let { place } = split(title)
      // Chapels are child pages of their parish church: take the village from there.
      if (!place && parts.length >= 4) place = split(greekTitleCase(cleanName(byId.get(p.parent)?.title.rendered ?? ""))).place
      // Churches of the Metropolis listed without a village are in Paphos town.
      if (!place && see === "paphos") place = "Πάφος"
      if (!/Να[οό]ς|Εξωκ|Παρεκκλ|Βασιλική|Κατακόμβη|Ναός/i.test(name)) continue
      const row: ImportRow = {
        name_el: name,
        location_el: place,
        see,
        region: place && LIMASSOL_DISTRICT.has(fold(place)) ? "limassol" : "paphos",
        image,
        source: p.link,
        source_label: see === "arsinoe" ? LABEL_ARSINOE : LABEL,
      }
      rows.push(setPin(row, pin?.pin ?? null, pin?.u))
    } else if (parts[0] === "ieres-mones" && parts.length === 2 && /^ier(a-moni|o-isychastirio)/.test(parts[1])) {
      // "Ιερά Μονή Αγίας Ειρήνης <br>Ελεδιώ" – the village is on the second line.
      const [first, ...rest] = p.title.rendered.split(/<br\s*\/?>/i)
      const name = greekTitleCase(cleanName(first))
      let place: string | undefined = rest.length ? greekTitleCase(cleanName(rest.join(" ")).replace(/^\((.*)\)$/, "$1")) : undefined
      if (place && /δάσος|παρά /i.test(place)) place = undefined
      const row: ImportRow = {
        name_el: name,
        type: "monastery",
        location_el: place,
        see: "paphos",
        region: place && LIMASSOL_DISTRICT.has(fold(place)) ? "limassol" : "paphos",
        image,
        source: p.link,
        source_label: LABEL,
      }
      rows.push(setPin(row, pin?.pin ?? null, pin?.u))
    }
  }
  // Pages sometimes exist twice ("…-2"): finish() drops the duplicates.
  return finish(rows, {})
}

export const paphos: ParishSource = {
  id: "paphos",
  see: "paphos",
  label: { el: "Ιερά Μητρόπολη Πάφου & Επισκοπή Αρσινόης (impaphou.org)", en: "Metropolis of Paphos & Bishopric of Arsinoe (impaphou.org)" },
  url: `${BASE}/ieroi-naoi/`,
  region: "paphos",
  note:
    "Churches, chapels (as child pages of their parish) and monasteries from impaphou.org. Churches of the Bishopric of Arsinoe get the see “arsinoe”; monasteries are all given to Paphos. " +
    "Only a handful of pages carry a map link, so most rows have no coordinates. Caves/hermitages and the list pages are skipped. Villages east of the district line are set to Limassol District.",
  fetch: (opts = {}) => fetchAll(opts),
}
