// Shared helpers for the parish importers (lib/parish-sources/*): polite fetching that respects robots.txt,
// HTML/Greek text clean-up, Google Maps link → coordinates, and a few naming heuristics.
// Server-side only (plain fetch, no dependencies).
import type { ImportRow } from "@/lib/import-rows"
import type { SiteType } from "@/lib/content"

export const USER_AGENT = "kyprosagiongi-importer/0.2 (Odoiporiko heritage map; parish list import; contact via odoiporiko.com)"

export type FetchOpts = { log?: (m: string) => void; signal?: AbortSignal }

const DELAY_MS = 350
const TIMEOUT_MS = 30_000
const lastHit = new Map<string, number>()

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error("aborted"))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason ?? new Error("aborted"))), { once: true })
  })

/** Waits so that requests to one host are at least DELAY_MS apart (sources run sequentially). */
async function politeWait(host: string, signal?: AbortSignal) {
  const wait = (lastHit.get(host) ?? 0) + DELAY_MS - Date.now()
  if (wait > 0) await sleep(wait, signal)
  lastHit.set(host, Date.now())
}

function timeoutSignal(signal?: AbortSignal, ms = TIMEOUT_MS) {
  const t = AbortSignal.timeout(ms)
  return signal ? AbortSignal.any([signal, t]) : t
}

// ---------- robots.txt ----------

type Rule = { allow: boolean; path: string }
const robotsCache = new Map<string, Promise<Rule[]>>()

function parseRobots(txt: string): Rule[] {
  // Rules of the groups that apply to "*" (we have no product token of our own in anyone's robots.txt).
  const rules: Rule[] = []
  let agents: string[] = []
  let inRules = false
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim()
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    const val = m[2].trim()
    if (key === "user-agent") {
      if (inRules) {
        agents = []
        inRules = false
      }
      agents.push(val.toLowerCase())
    } else if (key === "allow" || key === "disallow") {
      inRules = true
      if (agents.includes("*") && val) rules.push({ allow: key === "allow", path: val })
    }
  }
  return rules
}

function ruleMatches(path: string, rule: string) {
  const re = new RegExp("^" + rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"))
  return re.test(path)
}

/** True when robots.txt (group "*") lets us fetch the URL; longest matching rule wins, Allow on ties. */
export async function robotsAllows(url: string, signal?: AbortSignal): Promise<boolean> {
  const u = new URL(url)
  let rules = robotsCache.get(u.origin)
  if (!rules) {
    rules = (async () => {
      try {
        const res = await fetch(`${u.origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: timeoutSignal(signal, 15_000) })
        return res.ok ? parseRobots(await res.text()) : []
      } catch {
        return []
      }
    })()
    robotsCache.set(u.origin, rules)
  }
  const path = decodeURI(u.pathname) + u.search
  const raw = u.pathname + u.search
  let best: Rule | null = null
  for (const r of await rules) {
    if (!ruleMatches(raw, r.path) && !ruleMatches(path, r.path)) continue
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r
  }
  return !best || best.allow
}

/** GET a page politely (robots.txt, User-Agent, delay per host, timeout). Throws on HTTP errors. */
export async function getText(url: string, opts: FetchOpts = {}): Promise<string> {
  if (!(await robotsAllows(url, opts.signal))) throw new Error(`robots.txt disallows ${url}`)
  const host = new URL(url).host
  await politeWait(host, opts.signal)
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json,*/*" }, signal: timeoutSignal(opts.signal) })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

export async function getJson<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  return JSON.parse(await getText(url, opts)) as T
}

/** Every item of a WordPress REST collection (`/wp-json/wp/v2/pages?…`), 100 per request. */
export async function wpAll<T>(base: string, query: string, opts: FetchOpts = {}): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page < 50; page++) {
    const url = `${base}${base.includes("?") ? "&" : "?"}per_page=100&page=${page}${query ? `&${query}` : ""}`
    let batch: T[]
    try {
      batch = await getJson<T[]>(url, opts)
    } catch (e) {
      // WordPress answers 400 ("rest_post_invalid_page_number") past the last page.
      if (page > 1 && /^400 /.test((e as Error).message)) break
      throw e
    }
    out.push(...batch)
    opts.log?.(`  ${new URL(base).host}: ${out.length} items read`)
    if (batch.length < 100) break
  }
  return out
}

// ---------- text ----------

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", shy: "", middot: "·",
}
// Greek letters as named entities (&Alpha; … &omega;, &sigmaf;) – some site builders encode all Greek text this way.
const GREEK = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"]
GREEK.forEach((name, i) => {
  if (!name) return
  ENTITIES[name] = String.fromCodePoint(0x391 + i)
  ENTITIES[name.toLowerCase()] = String.fromCodePoint(0x3b1 + i)
})
ENTITIES.sigmaf = "ς"

/** Decodes HTML entities (named + numeric). */
export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m
  })
}

/** HTML fragment → plain one-line text: tags removed (<br> = space), entities decoded, soft hyphens and
 *  zero-width characters dropped, whitespace collapsed, NFC (the sites mix Greek accent code points). */
export function htmlText(s: string) {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/[­​-‍⁠﻿]/g, "")
    .replace(/[\s ]+/g, " ")
    .trim()
    .normalize("NFC")
}

const LATIN_TO_GREEK: Record<string, string> = {
  A: "Α", B: "Β", E: "Ε", H: "Η", I: "Ι", K: "Κ", M: "Μ", N: "Ν", O: "Ο", P: "Ρ", T: "Τ", X: "Χ", Y: "Υ", Z: "Ζ",
  a: "α", o: "ο", i: "ι", v: "ν", u: "υ", k: "κ", e: "ε", y: "γ",
}

/** In words that are otherwise Greek, replaces Latin look-alike letters ("Iερός", "TOY NEOY"). */
export function fixLookalikes(s: string) {
  return s.replace(/[A-Za-zͰ-Ͽἀ-῿]+/g, (w) => {
    if (!/[Ͱ-Ͽἀ-῿]/.test(w) && !/^(TOY|NEOY|TOY)$/.test(w)) return w
    return w.replace(/[A-Za-z]/g, (c) => LATIN_TO_GREEK[c] ?? c)
  })
}

const UNACCENTED = new Set(["και", "του", "της", "των", "τον", "την", "τη", "το", "τα", "οι", "η", "ο", "εν", "εκ", "ως", "τους", "τις", "στο", "στη", "στην", "στον", "στα", "μη", "δε", "με", "σε", "γη", "ή"])

/** Polytonic → monotonic Greek (breathings, iota subscripts dropped; grave/circumflex → acute; at most one
 *  accent per word; none on common monosyllables). Text that is already monotonic is unchanged. */
export function monotonic(s: string) {
  const out = s
    .normalize("NFD")
    .replace(/[᾿῾᾽ʼʽ]/g, "") // spacing breathings / koronis
    .replace(/[̓̔ͅ]/g, "") // psili, dasia, ypogegrammeni
    .replace(/[̀͂]/g, "́") // varia, perispomeni → tonos
    .normalize("NFC")
  return out.replace(/[Ͱ-Ͽἀ-῿]+/g, (w) => {
    const d = w.normalize("NFD")
    let seen = false
    let r = ""
    for (const ch of d) {
      if (ch === "́") {
        if (seen) continue
        seen = true
      }
      r += ch
    }
    r = r.normalize("NFC")
    const bare = r.normalize("NFD").replace(/́/g, "").normalize("NFC")
    return UNACCENTED.has(bare.toLowerCase()) && bare !== "ή" ? bare : r
  })
}

/** Full clean-up of a name taken from a page: text, look-alikes, monotonic. */
export function cleanName(html: string) {
  return monotonic(fixLookalikes(htmlText(html)))
    .replace(/(^|\s)Ιερος Ναος(?=\s)/g, "$1Ιερός Ναός")
    .replace(/(^|\s)Ιερα Μονη(?=\s)/g, "$1Ιερά Μονή")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s*[–-]\s*$/, "")
    .trim()
}

// Words whose accents can't be guessed from an ALL-CAPS heading.
const LEXICON = [
  "Ιερός", "Ιερά", "Ιερό", "Ιεροί", "Ναός", "Ναοί", "Μονή", "Μονής", "Μητροπολιτικός", "Καθεδρικός", "Παρεκκλήσιο", "Εξωκλήσι",
  "Αγίου", "Αγίας", "Αγίων", "Άγιος", "Αγία", "Άγιοι", "Οσίου", "Οσίας", "Οσίων", "Αποστόλου", "Αποστόλων", "Απόστολος",
  "Προφήτη", "Προφήτου", "Αρχαγγέλου", "Αρχαγγέλων", "Αρχάγγελος", "Παναγίας", "Παναγία", "Θεοτόκου", "Τιμίου", "Σταυρού", "Προδρόμου",
  "Σωτήρος", "Χριστού", "Μεταμορφώσεως", "Κοιμήσεως", "Ευαγγελισμού", "Αναστάσεως", "Ζωοδόχου", "Πηγής", "Υπαπαντής", "Τριάδος",
  "Γεωργίου", "Νικολάου", "Δημητρίου", "Ιωάννου", "Θεοδώρου", "Μάμαντος", "Μάμα", "Χαραλάμπους", "Βαρνάβα", "Ανδρέα", "Ανδρέου", "Λουκά",
  "Μιχαήλ", "Γαβριήλ", "Ηλία", "Ηλιού", "Παντελεήμονος", "Σπυρίδωνος", "Ειρήνης", "Μαρίνας", "Μαρίνης", "Παρασκευής", "Βαρβάρας",
  "Αναστασίας", "Αικατερίνης", "Φωτεινής", "Κυριακής", "Σοφίας", "Άννης", "Θέκλης", "Ευδοκίας", "Επικτήτου", "Ερμολάου", "Βασιλείου",
  "Αμβροσίου", "Μηνά", "Φανουρίου", "Κωνσταντίνου", "Ελένης", "Πέτρου", "Παύλου", "Δημητριανού", "Ιλαρίωνος", "Παντελεήμονος",
  "Μακαρίου", "Ευαγγελίστριας", "Χρυσελεούσας", "Χρυσοπολίτισσας", "Θερμιώτισσας", "Καρμιώτισσας", "Ασπροφορούσας", "Αψινθιώτισσας",
  "Κρινιώτισσας", "Μελανδρύνας", "Υπάτης", "Φανερωμένης", "Καθαρών", "Αντιφωνητού", "Αχειροποιήτου", "Αττάλου", "Χρυσοστόμου",
  "Θεολόγου", "Προσωρινώς", "Ενορία", "Επισκοπής", "Πόλεως", "Εισοδίων", "Μητροπολιτικός",
]
const lexicon = new Map(LEXICON.map((w) => [w.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(), w]))

/** "ΙΕΡΟΣ ΝΑΟΣ ΑΓΙΟΥ ΓΕΩΡΓΙΟΥ" → "Ιερός Ναός Αγίου Γεωργίου" (accents from a small lexicon; other words just
 *  capitalised). Text that isn't all-caps is returned as is. */
export function greekTitleCase(s: string) {
  if (/[α-ωάέήίόύώϊϋΐΰ]/.test(s)) return s
  return s.replace(/[Ͱ-Ͽ]+/g, (w) => {
    const key = w.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    const hit = lexicon.get(key)
    if (hit) return hit
    // Epithets of the Theotokos: "ΧΡΥΣΟΡΡΟΪΑΤΙΣΣΗΣ" → "Χρυσορροϊατίσσης".
    const epithet = w.match(/^(.*)Ι(ΣΣ(?:Α|Η|ΑΣ|ΗΣ))$/)
    if (epithet && key.length > 6) {
      const w2 = (epithet[1] + "Ί" + epithet[2]).toLowerCase().replace(/σ$/, "ς")
      return w2[0].toUpperCase() + w2.slice(1)
    }
    if (UNACCENTED.has(key.toLowerCase())) return key.toLowerCase()
    const lower = w.toLowerCase().replace(/σ$/, "ς")
    return lower[0].toUpperCase() + lower.slice(1)
  })
}

/** Strips accents/diacritics and lower-cases (for comparing names). */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ")

const TR: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o",
  π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
}

/** Simple Greek → Latin transliteration (ELOT 743-like), e.g. "Κάτω Πολεμίδια" → "Kato Polemidia". */
export function translit(s: string) {
  let t = fold(s)
    .replace(/αι/g, "ai").replace(/ει/g, "ei").replace(/οι/g, "oi").replace(/ου/g, "ou")
    .replace(/[αε]υ(?=[θκξπσςτφχψ]|$|\s)/g, (m) => (m[0] === "α" ? "af" : "ef"))
    .replace(/[αε]υ/g, (m) => (m[0] === "α" ? "av" : "ev"))
    .replace(/(^|\s)μπ/g, "$1b").replace(/μπ/g, "mp")
    .replace(/(^|\s)ντ/g, "$1d").replace(/ντ/g, "nt")
    .replace(/γγ/g, "ng").replace(/(^|\s)γκ/g, "$1g").replace(/γκ/g, "ng").replace(/γ([ξχ])/g, "n$1")
  t = [...t].map((c) => TR[c] ?? c).join("")
  return t.replace(/(^|[\s(-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase())
}

/** Type from a Greek name: Μονή/Ησυχαστήριο → monastery, Παρεκκλήσι/Εξωκλήσι → chapel, βασιλική → basilica. */
export function typeFromName(name: string): SiteType {
  const f = fold(name)
  if (/(^|\s)(ιερα |ιερον |ιερο )?(μονη|ησυχαστηρι|μετοχι)/.test(f) && !/ναοσ/.test(f.split(" ").slice(0, 2).join(" "))) return "monastery"
  if (/παρεκκλησι|παρεκλησι|εξωκκλησι|εξωκλησι|ξωκλησι|ξωκκλησι|εκκλησακι/.test(f)) return "chapel"
  if (/βασιλικη/.test(f) && !/ναοσ/.test(f)) return "basilica"
  return "church"
}

/** A WordPress upload URL without its "-1024x768" size suffix (the full-size original). */
export const fullSize = (url: string) => url.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp|gif)(?:$|\?))/i, "")

/** Absolute URL (images with relative src). */
export const absolute = (url: string, base: string) => {
  try {
    return new URL(decodeEntities(url), base).href
  } catch {
    return url
  }
}

/** Logos, map scans, placeholders, icons — not church photos. */
export function isPhoto(url: string | undefined | null): url is string {
  if (!url) return false
  return !/logo|placeholder|icon|header-red|favicon|avatar|banner|Villages_Maps|\.svg(\?|$)|\.gif(\?|$)|blank|default/i.test(decodeURIComponent(url))
}

// ---------- maps ----------

export type Pin = { lat: number; lng: number; exact: boolean }

const inCyprus = (lat: number, lng: number) => lat > 34.4 && lat < 35.8 && lng > 32.2 && lng < 34.7

/** Coordinates in a full Google Maps URL: the place pin (!3d…!4d…, last one wins) is exact; q=/ll= coordinates
 *  too; a bare viewport (@lat,lng) only approximate. Embed URLs (!2d lng !3d lat) count as exact. */
export function coordsFromMapUrl(url: string): Pin | null {
  const u = decodeEntities(decodeURIComponent(url))
  const pins = [...u.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)]
  if (pins.length) {
    const [, la, ln] = pins[pins.length - 1]
    if (inCyprus(+la, +ln)) return { lat: +la, lng: +ln, exact: true }
  }
  const embed = u.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/)
  if (embed && inCyprus(+embed[2], +embed[1])) return { lat: +embed[2], lng: +embed[1], exact: true }
  const q = u.match(/[?&](?:q|ll|query|destination|center)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
  if (q && inCyprus(+q[1], +q[2])) return { lat: +q[1], lng: +q[2], exact: true }
  const at = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (at && inCyprus(+at[1], +at[2])) return { lat: +at[1], lng: +at[2], exact: false }
  return null
}

const pinCache = new Map<string, Promise<Pin | null>>()

/** Follows a Google Maps short link (maps.app.goo.gl / goo.gl/maps) to its coordinates. */
export function resolveMapLink(url: string, opts: FetchOpts = {}): Promise<Pin | null> {
  const key = url.trim().replace(/^http:/, "https:")
  const direct = coordsFromMapUrl(key)
  if (direct) return Promise.resolve(direct)
  let p = pinCache.get(key)
  if (!p) {
    p = (async () => {
      let next = key
      for (let hop = 0; hop < 5; hop++) {
        await politeWait(new URL(next).host, opts.signal)
        let res: Response
        try {
          res = await fetch(next, { redirect: "manual", headers: { "User-Agent": USER_AGENT }, signal: timeoutSignal(opts.signal, 15_000) })
        } catch (e) {
          if (opts.signal?.aborted) throw e
          return null
        }
        const loc = res.headers.get("location")
        if (!loc) return null
        const pin = coordsFromMapUrl(loc)
        if (pin) return pin
        next = new URL(loc, next).href
        if (!/goo\.gl|google\./.test(new URL(next).host)) return null
      }
      return null
    })()
    pinCache.set(key, p)
  }
  return p
}

/** Google Maps links in an HTML fragment (short and full). */
export function mapLinks(html: string): string[] {
  const s = decodeEntities(html)
  const found = s.match(/https?:\/\/(?:maps\.app\.goo\.gl\/[A-Za-z0-9_-]+|goo\.gl\/maps\/[A-Za-z0-9_-]+|(?:www\.)?google\.[a-z.]+\/maps\/(?!d\/)[^"'\s<>]+)/g) ?? []
  return [...new Set(found)]
}

/** Puts a pin on a row (exact pin → coords "exact", viewport → "approximate"). */
export function setPin(row: ImportRow, pin: Pin | null, mapUrl?: string) {
  if (!pin) return row
  row.lat = Math.round(pin.lat * 1e6) / 1e6
  row.lng = Math.round(pin.lng * 1e6) / 1e6
  row.coords = pin.exact ? "exact" : "approximate"
  if (mapUrl) row.map_url = mapUrl
  return row
}

// ---------- rows ----------

/** Drops rows with the same name + place (keeps the first, filling in its missing fields from later ones). */
export function dedupe(rows: ImportRow[]): ImportRow[] {
  const byKey = new Map<string, ImportRow>()
  for (const r of rows) {
    const key = `${fold(r.name_el)}|${fold(r.location_el ?? "")}`
    const prev = byKey.get(key)
    if (!prev) byKey.set(key, r)
    else for (const [k, v] of Object.entries(r) as [keyof ImportRow, never][]) if (prev[k] == null || prev[k] === "") prev[k] = v
  }
  return [...byKey.values()]
}

/** Common finishing: trims, English place name, drops empty values. */
export function finish(rows: ImportRow[], base: Partial<ImportRow>): ImportRow[] {
  return dedupe(
    rows
      .filter((r) => r.name_el && r.name_el.length > 3)
      .map((r) => {
        const row: ImportRow = { ...base, ...r }
        row.name_el = row.name_el.replace(/\s+/g, " ").replace(/[.,;:·]+$/, "").trim()
        if (row.location_el) {
          row.location_el = row.location_el.replace(/\s+/g, " ").replace(/[.,;:·]+$/, "").trim()
          if (!row.location_en) row.location_en = translit(row.location_el)
        }
        if (!row.type) row.type = typeFromName(row.name_el)
        for (const k of Object.keys(row) as (keyof ImportRow)[]) if (row[k] === undefined || row[k] === "") delete row[k]
        return row
      }),
  )
}

/** Runs async work over items one at a time (sites are asked politely, never in parallel). */
export async function eachSeq<T>(items: T[], fn: (item: T, i: number) => Promise<void>, signal?: AbortSignal) {
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) throw signal.reason ?? new Error("aborted")
    await fn(items[i], i)
  }
}
