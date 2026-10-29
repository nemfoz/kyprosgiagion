// Holy Metropolis of Morphou (immorfou.org.cy, WordPress). Each free village of the three vicariates (Solea,
// Marathasa, Pitsilia) is a post with labelled lines — «Ενοριακός Ναός: …», «Ιερές Μονές: …», «Παρεκκλήσια: …»,
// «Εξωκκλήσια: …». Only those lines are read: the priest, chanters and committee lines are skipped.
// Monasteries have posts of their own.
import type { ImportRow, ParishSource } from "@/lib/import-rows"
import { absolute, cleanName, finish, fold, fullSize, isPhoto, wpAll, type FetchOpts } from "./util"

const BASE = "https://immorfou.org.cy"
const LABEL = "Ιερά Μητρόπολη Μόρφου"
const VILLAGES = [83, 84, 85] // Περιφέρεια Πεδινής – Βορείου Πιτσιλιάς, Σολέας, Μαραθάσας
const MONASTERIES = 92

type WpPost = { id: number; link: string; title: { rendered: string }; content: { rendered: string }; categories: number[] }

const KINDS: [RegExp, (n: string) => ImportRow["type"] | "skip", (n: string) => string][] = [
  [/^Ενοριακ(ός|οί) Να(ός|οί)/i, () => "church", (n) => (/^(Ιερ|Να)/.test(n) ? n : `Ιερός Ναός ${n}`)],
  [/^Ιερ(ά|ές) Μον(ή|ές)/i, () => "monastery", (n) => (/^(Ιερ|Μον)/.test(n) ? n : `Ιερά Μονή ${n}`)],
  [/^Παρεκκλήσι/i, () => "chapel", (n) => (/^Παρεκκλ/.test(n) ? n : `Παρεκκλήσι ${n}`)],
  [/^Εξωκκλήσι|^Εξωκλήσι/i, () => "chapel", (n) => (/^Εξωκ/.test(n) ? n : `Εξωκλήσι ${n}`)],
]

/** The labelled lines of a village post → churches. */
function villageRows(post: WpPost): ImportRow[] {
  const village = cleanName(post.title.rendered).replace(/\s*\((Σολέας)\)$/, " $1")
  const html = post.content.rendered
  const img = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => absolute(m[1], BASE)).find(isPhoto)
  const rows: ImportRow[] = []
  // Blocks in order: <p>…</p> and <ul>…</ul>.
  const blocks = [...html.matchAll(/<(p|ul|div)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => ({ tag: m[1], html: m[2] }))
  let kind: (typeof KINDS)[number] | null = null
  const add = (raw: string) => {
    if (!kind) return
    const text = cleanName(raw).replace(/\s*[–-]\s*Μνημείο (Ουνέσκο|UNESCO).*$/i, "").trim()
    // Split on commas outside brackets ("Μετόχι Μονής Λαμπαδιστού (Μπάρσκυ, Β’ Κώδικας)" is one name).
    for (const part of text.split(/[,;](?![^()]*\))/)) {
      const n = part.replace(/^\s*\d+\.\s*/, "").trim()
      if (n.length < 4 || /^Μνημείο/i.test(n)) continue
      // Belt and braces: never a line about a person (clergy titles, phone numbers).
      if (/\d{5}|τηλ|Οικον\.|Πρεσβ|Αρχιμ|Πρωτ\.|Ιερομ|Διάκ/i.test(n)) continue
      const type = kind[1](n)
      if (type === "skip") continue
      rows.push({ name_el: kind[2](n), type, location_el: village, source: post.link })
    }
  }
  for (const b of blocks) {
    if (b.tag === "ul") {
      for (const li of b.html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) add(li[1])
      continue
    }
    const label = b.html.match(/^\s*<strong>([\s\S]*?)<\/strong>([\s\S]*)$/)
    if (!label) {
      if (kind && cleanName(b.html)) add(b.html)
      continue
    }
    const name = cleanName(label[1]).replace(/:$/, "").trim()
    kind = KINDS.find(([re]) => re.test(name)) ?? null // Εφημέριος, Ψάλτες, Επίτροποι, Προσκυνητάρια… → not read
    const rest = label[2].replace(/^\s*:/, "")
    if (kind && cleanName(rest)) add(rest)
  }
  const parish = rows.find((r) => r.type === "church")
  if (parish && img) parish.image = fullSize(img)
  return rows
}

async function fetchAll(opts: FetchOpts): Promise<ImportRow[]> {
  opts.log?.("immorfou.org.cy: reading posts from the WordPress API…")
  const posts = await wpAll<WpPost>(`${BASE}/wp-json/wp/v2/posts`, `categories=${[...VILLAGES, MONASTERIES].join(",")}&_fields=id,link,title,content,categories`, opts)
  const rows: ImportRow[] = []
  for (const p of posts) {
    if (p.categories.some((c) => VILLAGES.includes(c))) rows.push(...villageRows(p))
    else if (p.categories.includes(MONASTERIES)) {
      const title = cleanName(p.title.rendered)
      const m = title.match(/^(.*?)\s+(?:παρά (?:τα|τον|την|το)\s+|στα\s+)(.+)$/)
      const img = [...p.content.rendered.matchAll(/<img[^>]+src="([^"]+)"/g)].map((x) => absolute(x[1], BASE)).find(isPhoto)
      rows.push({
        name_el: (m?.[1] ?? title).replace(/^Ιερά Μονη /, "Ιερά Μονή "),
        type: /μονη|ησυχαστηρι/.test(fold(title)) ? "monastery" : "church",
        location_el: m?.[2]?.replace(/^Σπήλια$/, "Σπήλια"),
        image: img ? fullSize(img) : undefined,
        source: p.link,
      })
    }
  }
  opts.log?.(`immorfou.org.cy: ${posts.length} posts, ${rows.length} churches`)
  return finish(rows, { see: "morphou", region: "nicosia", source_label: LABEL })
}

export const morphou: ParishSource = {
  id: "morphou",
  see: "morphou",
  label: { el: "Ιερά Μητρόπολη Μόρφου (immorfou.org.cy)", en: "Metropolis of Morphou (immorfou.org.cy)" },
  url: `${BASE}/περιφέρεια-σολέας/`,
  region: "nicosia",
  note:
    "Parish churches, monasteries, chapels and outlying chapels from the village posts of the Solea, Marathasa and Pitsilia vicariates, plus the monastery posts (a monastery may appear twice: in its village and with its own post). " +
    "Chapel names are as listed («Αγίου Γεωργίου» → «Παρεκκλήσι Αγίου Γεωργίου»). The occupied villages are prose articles and are not read. No map pins on the site.",
  fetch: (opts = {}) => fetchAll(opts),
}
