// Holy Metropolis of Tamassos and Oreini (imtamasou.org.cy, WordPress). «Αρχιερατικές Περιφέρειες» has a page per
// village with its parish church(es) in bold («Ἱερὸς Ναὸς Παναγίας.») and a photo; monasteries and hermitages
// have pages of their own. The text is polytonic — names are converted to monotonic.
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { cleanName, coordsFromMapUrl, finish, htmlText, isPhoto, mapLinks, monotonic, setPin, wpAll, type FetchOpts } from "./util"

const BASE = "https://www.imtamasou.org.cy"
const LABEL = "Ιερά Μητρόπολη Ταμασού και Ορεινής"

type WpPage = { id: number; link: string; parent: number; title: { rendered: string }; content: { rendered: string } }

const CHURCH = /(Ιερ[όο]ς|Ιεροί|Ιερά|Ιερόν|Ιερό)\s+(Να[όο]ς|Ναοί|Μονή|Ησυχαστήριο)/

/** Photo of the page (the first image that isn't one of the scanned village maps). */
function photo(html: string) {
  for (const m of html.matchAll(/<img[^>]+>/g)) {
    const orig = m[0].match(/data-orig-file="([^"]+)"/)?.[1] ?? m[0].match(/\ssrc="([^"]+)"/)?.[1]
    if (!orig) continue
    // Jetpack CDN copies (i0.wp.com/www.imtamasou.com/…) of the site's own uploads → the original on the site.
    const url = orig
      .replace(/&amp;/g, "&")
      .replace(/\?.*$/, "")
      .replace(/^https?:\/\/i\d\.wp\.com\/www\.imtamasou\.(?:com|org\.cy)\//, `${BASE}/`)
    if (isPhoto(url) && /\.(jpe?g|png|webp)$/i.test(url)) return url
  }
  return undefined
}

function parishNames(html: string): string[] {
  const bold = [...html.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((m) => cleanName(m[1]))
  let names = bold.filter((s) => CHURCH.test(s) && !/Περιφέρεια|Επίτροπ|Εφημέρ/.test(s))
  if (!names.length) {
    // Some pages don't use bold: take the "Ιερός Ναός …" sentence from the text.
    const text = monotonic(htmlText(html))
    names = [...text.matchAll(/(?:Ιερ[όο]ς Να[όο]ς|Ιεροί Ναοί)[^.:;]{3,90}/g)].map((m) => m[0])
  }
  return [...new Set(names.map((n) => n.replace(/[.:;,\s]+$/, "").replace(/^Ιερος Ναος/, "Ιερός Ναός")))]
}

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  const log = opts.log ?? (() => {})
  log("imtamasou.org.cy: reading pages from the WordPress API…")
  const pages = await wpAll<WpPage>(`${BASE}/wp-json/wp/v2/pages`, "_fields=id,link,parent,title,content", opts)
  const rows: ImportRow[] = []
  for (const p of pages) {
    const path = decodeURIComponent(new URL(p.link).pathname).split("/").filter(Boolean)
    const title = cleanName(p.title.rendered).replace(/\.$/, "")
    const html = p.content.rendered
    const link = mapLinks(html).map((u) => ({ u, pin: coordsFromMapUrl(u) })).find((x) => x.pin)
    if (path[1] === "arxieratikes_periferies_tamasou-2" && path.length === 4) {
      const image = photo(html)
      parishNames(html).forEach((name, i) => {
        rows.push({ name_el: name, location_el: title, image: i === 0 ? image : undefined, source: p.link })
      })
    } else if ((path[1] === "ieres-mones-pareklisia-tamasou" && path.length === 3) || (path.length === 1 && /ησυχαστήριον|μονή/i.test(path[0]))) {
      if (!CHURCH.test(title) || /Να[όο]ς/.test(title)) continue
      const name = title.replace(/^Ιερόν Μονή/, "Ιερά Μονή").replace(/Πανάγιας/, "Παναγίας")
      const place = /Ηρακλειδίου/.test(name) ? "Πολιτικό" : name.match(/\s(Κοτσιάτη|Καλαμιθάση)$/)?.[1]
      rows.push(setPin({ name_el: name, type: "monastery", location_el: place, image: photo(html), source: p.link }, link?.pin ?? null, link?.u))
    }
  }
  log(`imtamasou.org.cy: ${rows.length} churches and monasteries`)
  return finish(rows, { see: "tamassos-oreini", region: "nicosia", source_label: LABEL })
}

export const tamassos: ParishSource = {
  id: "tamassos",
  see: "tamassos-oreini",
  label: { el: "Ιερά Μητρόπολη Ταμασού και Ορεινής (imtamasou.org.cy)", en: "Metropolis of Tamassos and Oreini (imtamasou.org.cy)" },
  url: `${BASE}/tamasos-2/arxieratikes_periferies_tamasou-2/`,
  region: "nicosia",
  note:
    "Parish churches from the village pages of the five vicariates, plus monasteries and hermitages. Chapels are not listed on the site, " +
    "and there are no map pins (rows have no coordinates). Names are converted from polytonic to monotonic.",
  fetch: (opts = {}) => fetchAll(opts),
}
