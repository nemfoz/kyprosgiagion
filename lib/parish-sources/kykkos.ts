// Holy Metropolis of Kykkos and Tillyria (imkykkou.org.cy, WordPress). «Ιεροί Ναοί – Κοινότητες – Ενορίες» is one
// page of accordions, a village per accordion; the first sentence of each is the church («Ιερός Ναός Αγίου
// Γεωργίου.»), followed by the priest and committee, which are not read. Plus the Monastery of Kykkos itself.
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { cleanName, finish, getJson, type FetchOpts } from "./util"

const BASE = "https://imkykkou.org.cy"
const LABEL = "Ιερά Μητρόπολη Κύκκου και Τηλλυρίας"

// The accordion titles are in capitals without accents.
const VILLAGES: Record<string, string> = {
  "ΑΝΩ ΠΥΡΓΟΣ": "Άνω Πύργος", ΚΑΜΠΟΣ: "Κάμπος", "ΚΑΤΩ ΠΥΡΓΟΣ": "Κάτω Πύργος", ΜΗΛΙΚΟΥΡΙ: "Μηλικούρι", ΜΟΣΦΥΛΙ: "Μοσφίλι",
  ΠΗΓΑΙΝΙΑ: "Πηγαίνια", ΤΣΑΚΚΙΣΤΡΑ: "Τσακκίστρα", ΒΑΡΙΣΙΑ: "Βαρίσεια", ΓΑΛΗΝΗ: "Γαλήνη", ΛΟΥΤΡΟΣ: "Λουτρός", ΛΙΜΝΙΤΗΣ: "Λιμνίτης",
}

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  opts.log?.("imkykkou.org.cy: reading the parish page…")
  const [page] = await getJson<{ link: string; content: { rendered: string } }[]>(
    `${BASE}/wp-json/wp/v2/pages?slug=naoi-enories-koinotites&_fields=link,content`,
    opts,
  )
  if (!page) throw new Error("imkykkou.org.cy: parish page not found")
  const html = page.content.rendered.replace(/&#8221;|&#8243;|”|″/g, '"')
  const rows: ImportRow[] = []
  for (const m of html.matchAll(/\[vision_accordion title="([^"]*)"[^\]]*\]([\s\S]*?)\[\/vision_accordion\]/g)) {
    const key = cleanName(m[1]).replace(/[.\s]+$/, "").trim()
    const village = VILLAGES[key]
    if (!village) continue // e.g. churches demolished after 1974, listed without a village
    const text = cleanName(m[2]).replace(/^[.\s]+/, "")
    // The first sentence names the church(es); stop before «Εφημέριος», «Επίτροποι»…
    const first = text.split(/\.\s|\s(?=Εφημέρ|Επίτροπ|Ψάλτ)/)[0].replace(/\.$/, "")
    for (const name of first.split(/\s+και\s+(?=Ιερός Ναός)/)) {
      if (/Να[οό]ς|Μονή/.test(name)) rows.push({ name_el: name.trim(), location_el: village, source: page.link })
    }
    // «Εξαρτηματικοί Ιεροί Ναοί: 1. Αγίου Νικολάου. 2. … 4. Παρεκκλήσιον Αγίου Ανδρονίκου.»
    const deps = text.match(/Εξαρτηματικοί Ιεροί Ναοί:\s*(.*)$/)?.[1]
    if (deps)
      for (const d of deps.split(/\s*\d+\.\s+/).map((s) => s.replace(/\.$/, "").trim()).filter((s) => s.length > 3)) {
        const name = /^Παρεκκλήσι/.test(d) ? d.replace(/^Παρεκκλήσιον/, "Παρεκκλήσιο") : `Ιερός Ναός ${d}`
        rows.push({ name_el: name, location_el: village, source: page.link })
      }
  }
  rows.push({ name_el: "Ιερά Βασιλική και Σταυροπηγιακή Μονή Κύκκου", type: "monastery", source: `${BASE}/monastiri` })
  return finish(rows, { see: "kykkos-tillyria", region: "nicosia", source_label: LABEL })
}

export const kykkos: ParishSource = {
  id: "kykkos",
  see: "kykkos-tillyria",
  label: { el: "Ιερά Μητρόπολη Κύκκου και Τηλλυρίας (imkykkou.org.cy)", en: "Metropolis of Kykkos and Tillyria (imkykkou.org.cy)" },
  url: `${BASE}/naoi-enories-koinotites`,
  region: "nicosia",
  note:
    "The parish churches of the Tillyria villages (free and occupied) from one page, plus the Monastery of Kykkos. " +
    "No photos or map pins on that page. Churches listed as demolished, without a village, are skipped.",
  fetch: (opts = {}) => fetchAll(opts),
}
