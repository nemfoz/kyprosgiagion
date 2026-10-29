// Holy Metropolis of Kyrenia (metropoliskyrenia.org, a Wix site). «Ενοριακοί Ναοί» is a photo gallery (church name
// in capitals + village); «Ιερές Μονές» lists the occupied monasteries, each with a Google Maps link
// («Γεωγραφικές Συντεταγμένες»). Committee members listed under the monasteries are not read.
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { cleanName, eachSeq, finish, getText, greekTitleCase, htmlText, isPhoto, resolveMapLink, setPin, type FetchOpts } from "./util"

const BASE = "https://www.metropoliskyrenia.org"
const CHURCHES_URL = `${BASE}/${encodeURIComponent("ιερές-μονές")}` // (sic: the parish churches page has this slug)
const MONASTERIES_URL = `${BASE}/mones`
const LABEL = "Ιερά Μητρόπολη Κυρηνείας"

// Villages of the see in Nicosia District.
const NICOSIA = new Set(["Άγιος Βασίλειος", "Σκυλλούρα", "Κοκκινοτριμιθιά", "Μάμμαρι"])

// "(παρά την κοινότητα Συσκλήπου)" → village (nominative).
const NEAR: Record<string, string> = {
  Μύρτου: "Μύρτου", Κοκκινοτριμιθιάς: "Κοκκινοτριμιθιά", Συσκλήπου: "Σύσκληπος", Φτερύχων: "Φτέρυχα", Καραβά: "Καραβάς",
  Καρμίου: "Κάρμι", Καλογραίας: "Καλογραία", "Αγίου Αμβροσίου": "Άγιος Αμβρόσιος", Κερύνειας: "Κερύνεια",
  "Λάρνακος Λαπήθου": "Λάρνακας Λαπήθου", Κουτσοβέντη: "Κουτσοβέντης", Συγχαρίου: "Συγχαρί", Βασίλειας: "Βασίλεια", Χάρτζιας: "Χάρτζια",
}

const nameCase = (s: string) =>
  greekTitleCase(cleanName(s).replace(/\s+/g, " "))
    .replace(/\s*&\s*/g, " και ")
    .replace(/\s+Προσωρινώς ως .*$/i, "")
    .replace(/^Ιερός Ναός Πέτρου και Παύλου$/, "Ιερός Ναός Αποστόλων Πέτρου και Παύλου")

/** Full-size Wix image: https://static.wixstatic.com/media/<file>/v1/fill/… → …/media/<file>. */
const wixOriginal = (src: string) => src.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+)/)?.[1]

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  const log = opts.log ?? (() => {})
  const rows: ImportRow[] = []

  log("metropoliskyrenia.org: reading the parish churches…")
  const churches = await getText(CHURCHES_URL, opts)
  for (const item of churches.split('data-testid="gallery-item-item"').slice(1)) {
    const title = item.match(/data-testid="gallery-item-title"[^>]*>([^<]*)</)?.[1]
    const village = item.match(/data-testid="gallery-item-description"[^>]*>([^<]*)</)?.[1]
    if (!title) continue
    const place = village ? cleanName(village) : undefined
    const img = wixOriginal(item.match(/src="(https:\/\/static\.wixstatic\.com\/media\/[^"]+)"/)?.[1] ?? "")
    rows.push({
      name_el: nameCase(title),
      location_el: place,
      region: place && NICOSIA.has(place) ? "nicosia" : "kyrenia",
      image: isPhoto(img) ? img : undefined,
      source: CHURCHES_URL,
    })
  }

  log("metropoliskyrenia.org: reading the monasteries…")
  const html = (await getText(MONASTERIES_URL, opts)).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
  // Text runs and map links in page order.
  const tokens = [...html.matchAll(/<a [^>]*href="(https?:\/\/(?:goo\.gl\/maps|maps\.app\.goo\.gl)\/[^"]+)"|>([^<]+)</g)].map((m) =>
    m[1] ? { link: m[1].trim() } : { text: htmlText(m[2] ?? "") },
  ).filter((t) => t.link || t.text)
  const monasteries: (ImportRow & { _link?: string })[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].text
    const near = tokens.slice(i + 1, i + 3).find((x) => x.text)?.text
    if (t && t.length > 3 && t === t.toUpperCase() && /[Α-Ω]/.test(t) && near && /^\(παρά τ/.test(near)) {
      const village = near.replace(/^\(παρά (?:την|τη|το|τον)\s+(?:κοινότητα|κωμόπολη|Κωμόπολη|πόλη)\s+(?:της\s+|του\s+)?/, "").replace(/\)?\s*$/, "").trim()
      const place = NEAR[village] ?? village
      monasteries.push({
        name_el: `Ιερά Μονή ${nameCase(t)}`,
        type: "monastery",
        location_el: place,
        region: NICOSIA.has(place) ? "nicosia" : "kyrenia",
        source: MONASTERIES_URL,
      })
    } else if (tokens[i].link && monasteries.length && !monasteries.at(-1)!._link) {
      monasteries.at(-1)!._link = tokens[i].link
    }
  }
  log(`metropoliskyrenia.org: ${rows.length} churches, ${monasteries.length} monasteries; resolving map links…`)
  await eachSeq(monasteries, async (m) => {
    if (m._link) setPin(m, await resolveMapLink(m._link, opts), m._link)
    delete m._link
  }, opts.signal)
  return finish([...rows, ...monasteries], { see: "kyrenia", source_label: LABEL })
}

export const kyrenia: ParishSource = {
  id: "kyrenia",
  see: "kyrenia",
  label: { el: "Ιερά Μητρόπολη Κυρηνείας (metropoliskyrenia.org)", en: "Metropolis of Kyrenia (metropoliskyrenia.org)" },
  url: CHURCHES_URL,
  region: "kyrenia",
  note:
    "Parish churches from the «Ενοριακοί Ναοί» gallery (no pins) and the occupied monasteries with their Google Maps pins. " +
    "Names on the site are in capitals; accents are restored from a small word list, so check unusual names.",
  fetch: (opts = {}) => fetchAll(opts),
}
