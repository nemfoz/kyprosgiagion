// How complete a church's page is, and the points contributors earn for completing it.
// Shared by the public pages, the editor and the scoring of approved proposals.
//
// Each language version of a page is worth 100 points, divided between its sections
// (Greek 100 + English 100 = 200). Photo, location and sources serve both languages,
// so they count in both. Anything beyond a complete page — more photos, old photos, videos —
// earns bonus points that don't change the page's percentage.
//
// The point values are a PointsConfig that superadmins edit at /admin/points (stored in the
// `settings` table, see lib/points.ts); labels, rules and badges are fixed here.
import { LANGS, type Lang, type SiteContent } from "@/lib/content"

export type SectionKey = "identity" | "summary" | "history" | "facts" | "sources" | "photo" | "location"
export type BadgeArea = "writer" | "translator" | "researcher" | "photographer" | "archivist" | "mapper"

type Section = {
  key: SectionKey
  /** One answer serves both languages (counts in both). */
  shared: boolean
  label: Record<Lang, string>
  hint: Record<Lang, string>
}

export const PAGE_POINTS = 100

export const SECTIONS: Section[] = [
  { key: "history", shared: false, label: { el: "Ιστορικό", en: "History" }, hint: { el: "Η ιστορία του ναού: χρονολόγηση, αρχιτεκτονική, τοιχογραφίες, τι συνέβη μετά το 1974.", en: "The church's history: dating, architecture, wall paintings, what happened after 1974." } },
  { key: "summary", shared: false, label: { el: "Σύντομη περιγραφή", en: "Short description" }, hint: { el: "Δύο-τρεις προτάσεις που εμφανίζονται στον χάρτη.", en: "Two or three sentences shown on the map." } },
  { key: "facts", shared: false, label: { el: "Βασικά στοιχεία", en: "Key facts" }, hint: { el: "Τουλάχιστον 3, π.χ. Χρονολόγηση, Αρχιτεκτονική, Πανήγυρη, Σημερινή κατάσταση.", en: "At least 3, e.g. Dating, Architecture, Feast day, Present state." } },
  { key: "identity", shared: false, label: { el: "Όνομα και τοποθεσία", en: "Name and place" }, hint: { el: "Το όνομα του ναού και το χωριό ή η πόλη όπου βρίσκεται.", en: "The church's name and the village or town where it stands." } },
  { key: "photo", shared: true, label: { el: "Φωτογραφία", en: "Photograph" }, hint: { el: "Μια φωτογραφία του ναού (δική σας ή με άδεια, με αναφορά πηγής).", en: "A photo of the church (your own or with permission, with its source)." } },
  { key: "location", shared: true, label: { el: "Ακριβής θέση", en: "Exact location" }, hint: { el: "Το σημάδι ακριβώς πάνω στον ναό, επαληθευμένο από διαχειριστή.", en: "The pin exactly on the church, verified by an admin." } },
  { key: "sources", shared: true, label: { el: "Πηγές", en: "Sources" }, hint: { el: "Τουλάχιστον 2 βιβλία, άρθρα ή ιστοσελίδες από όπου προέρχονται οι πληροφορίες.", en: "At least 2 books, articles or websites the information comes from." } },
]

export type BonusKey = "extra_photo" | "historic_photo" | "video"

export type PointsConfig = {
  /** Points per language version of the page, per section; they must add up to PAGE_POINTS. */
  sections: Record<SectionKey, number>
  /** Bonus points per item. */
  bonuses: Record<BonusKey, number>
  /** Every approved proposal. */
  proposal: number
  /** Points needed for each title after the first (see LEVELS). */
  levels: number[]
}

export const DEFAULT_POINTS: PointsConfig = {
  sections: { history: 35, summary: 10, facts: 10, identity: 5, photo: 15, location: 15, sources: 10 },
  bonuses: { extra_photo: 5, historic_photo: 10, video: 10 },
  proposal: 5,
  levels: [75, 250, 600, 1500],
}

const int = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100_000) : fallback
}

/** Fills in missing or invalid values from the defaults. */
export function normalisePoints(raw: unknown): PointsConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof PointsConfig, unknown>>
  const pick = <K extends string>(src: unknown, defaults: Record<K, number>) => Object.fromEntries(
    Object.entries(defaults).map(([k, d]) => [k, int((src as Record<string, unknown> | undefined)?.[k], d as number)]),
  ) as Record<K, number>
  return {
    sections: pick(r.sections, DEFAULT_POINTS.sections),
    bonuses: pick(r.bonuses, DEFAULT_POINTS.bonuses),
    proposal: int(r.proposal, DEFAULT_POINTS.proposal),
    levels: DEFAULT_POINTS.levels.map((d, i) => int(Array.isArray(r.levels) ? r.levels[i] : undefined, d)),
  }
}

/** Problems with a config, in Greek (empty = valid). */
export function validatePoints(cfg: PointsConfig): string[] {
  const errors: string[] = []
  const sum = Object.values(cfg.sections).reduce((n, v) => n + v, 0)
  if (sum !== PAGE_POINTS) errors.push(`Οι ενότητες πρέπει να έχουν άθροισμα ${PAGE_POINTS} ανά γλώσσα (τώρα ${sum}).`)
  if (cfg.levels.some((v, i) => v <= (i ? cfg.levels[i - 1] : 0))) errors.push("Οι πόντοι των τίτλων πρέπει να αυξάνονται.")
  return errors
}

export type MissionKey = SectionKey | `${SectionKey}.${Lang}`

export type Mission = {
  key: MissionKey
  section: SectionKey
  /** null = serves both languages. */
  lang: Lang | null
  label: Record<Lang, string>
  hint: Record<Lang, string>
  badge: BadgeArea
}

const LANG_NAME: Record<Lang, Record<Lang, string>> = { el: { el: "ελληνικά", en: "Greek" }, en: { el: "αγγλικά", en: "English" } }

const badgeFor = (section: SectionKey, lang: Lang | null): BadgeArea =>
  section === "photo" ? "photographer"
  : section === "location" ? "mapper"
  : lang === "en" ? "translator"
  : section === "facts" || section === "sources" ? "researcher"
  : "writer"

/** Everything a page can be missing, in the order shown to contributors. */
export const MISSIONS: Mission[] = SECTIONS.flatMap((s): Mission[] => s.shared
  ? [{ key: s.key, section: s.key, lang: null, label: s.label, hint: s.hint, badge: badgeFor(s.key, null) }]
  : LANGS.map((lang) => ({
      key: `${s.key}.${lang}` as const, section: s.key, lang, hint: s.hint, badge: badgeFor(s.key, lang),
      label: { el: `${s.label.el} (${LANG_NAME[lang].el})`, en: `${s.label.en} (${LANG_NAME[lang].en})` },
    })))

export const TOTAL_POINTS = PAGE_POINTS * LANGS.length

/** Points a mission earns: per language, or both languages for shared sections. */
export const missionPoints = (cfg: PointsConfig, m: Mission) => cfg.sections[m.section] * (m.lang ? 1 : LANGS.length)

export type ScoredMission = Mission & { points: number }
export const scoredMissions = (cfg: PointsConfig): ScoredMission[] => MISSIONS.map((m) => ({ ...m, points: missionPoints(cfg, m) }))

// Text the importer and the samples use until someone writes the real history.
const PLACEHOLDER = /θα συμπληρωθεί|will be added|Δείγμα κειμένου|Sample text/i
const realText = (s: string, min: number) => s.trim().length >= min && !PLACEHOLDER.test(s)
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean).length

export type CompletenessInput = { content: SiteContent; coordsVerified: boolean; photoCount: number }

export function missionsDone(s: CompletenessInput): Set<MissionKey> {
  const done = new Set<MissionKey>()
  for (const lang of LANGS) {
    const c = s.content[lang]
    if (c.name.trim() && c.location.trim()) done.add(`identity.${lang}`)
    if (realText(c.summary, 40)) done.add(`summary.${lang}`)
    if (realText(c.body, 400)) done.add(`history.${lang}`)
    if (lines(c.facts) >= 3) done.add(`facts.${lang}`)
  }
  if (LANGS.some((l) => lines(s.content[l].sources) >= 2)) done.add("sources")
  if (s.photoCount >= 1) done.add("photo")
  if (s.coordsVerified) done.add("location")
  return done
}

/** Points of one language version of the page (out of PAGE_POINTS). */
const langPoints = (cfg: PointsConfig, done: Set<MissionKey>, lang: Lang) =>
  SECTIONS.filter((s) => done.has(s.shared ? s.key : `${s.key}.${lang}`)).reduce((n, s) => n + cfg.sections[s.key], 0)

export function completeness(s: CompletenessInput, cfg: PointsConfig) {
  const done = missionsDone(s)
  const byLang = { el: langPoints(cfg, done, "el"), en: langPoints(cfg, done, "en") } satisfies Record<Lang, number>
  return {
    percent: Math.round(((byLang.el + byLang.en) / TOTAL_POINTS) * 100),
    /** Points per language version, each out of PAGE_POINTS. */
    byLang,
    done,
    missing: scoredMissions(cfg).filter((m) => !done.has(m.key)),
  }
}

// ---- bonus points: additions beyond a complete page ----

export const BONUSES: Record<BonusKey, { label: Record<Lang, string>; hint: Record<Lang, string>; badge: BadgeArea }> = {
  extra_photo: { badge: "photographer", label: { el: "Επιπλέον φωτογραφία", en: "Additional photograph" }, hint: { el: "Εσωτερικό, λεπτομέρειες, τοιχογραφίες, η σημερινή κατάσταση.", en: "Interior, details, wall paintings, the present state." } },
  historic_photo: { badge: "archivist", label: { el: "Παλιά φωτογραφία", en: "Old photograph" }, hint: { el: "Αρχειακή ή οικογενειακή φωτογραφία, π.χ. πριν από το 1974.", en: "An archive or family photo, e.g. from before 1974." } },
  video: { badge: "photographer", label: { el: "Βίντεο", en: "Video" }, hint: { el: "Σύνδεσμος YouTube με βίντεο του ναού (λειτουργία, ντοκιμαντέρ, επίσκεψη).", en: "A YouTube link to a video of the church (service, documentary, visit)." } },
}

/** Bonuses for photos and videos added to a page that already has `existingPhotos` photos. */
export function mediaBonuses(existingPhotos: number, photos: { historic?: boolean }[], videos: unknown[] = []): BonusKey[] {
  return [
    ...photos.flatMap((p, i): BonusKey[] => p.historic ? ["historic_photo"] : existingPhotos + i > 0 ? ["extra_photo"] : []),
    ...videos.map((): BonusKey => "video"),
  ]
}

// ---- contributors ----

export type Earned = MissionKey | BonusKey

// Keys stored by approvals made before the per-language scoring.
const LEGACY: Record<string, Earned> = {
  history_el: "history.el", history_en: "history.en", summary: "summary.el", photos3: "extra_photo", facts: "facts.el", english: "identity.en",
}
export const normaliseEarned = (keys: string[]) => keys.map((k) => LEGACY[k] ?? k)

const earnedPoints = (cfg: PointsConfig, k: string) => {
  const m = MISSIONS.find((x) => x.key === k)
  return m ? missionPoints(cfg, m) : cfg.bonuses[k as BonusKey] ?? 0
}

/** Points of an approved proposal from what it completed — recomputed for everyone when the config changes. */
export const proposalPoints = (cfg: PointsConfig, completed: string[]) =>
  cfg.proposal + normaliseEarned(completed).reduce((n, k) => n + earnedPoints(cfg, k), 0)

/** What an approved proposal earns: missions newly completed + bonuses. */
export function scoreProposal(cfg: PointsConfig, before: Set<MissionKey>, after: Set<MissionKey>, bonuses: BonusKey[]) {
  const completed: Earned[] = [...MISSIONS.filter((m) => after.has(m.key) && !before.has(m.key)).map((m) => m.key), ...bonuses]
  return { completed, points: proposalPoints(cfg, completed) }
}

export const BADGES = {
  first: { el: "Πρώτη συνεισφορά", en: "First contribution", icon: "🕯️", need: 1, hint: { el: "Η πρώτη εγκεκριμένη πρόταση.", en: "Your first approved proposal." } },
  writer: { el: "Συντάκτης", en: "Writer", icon: "📜", need: 3, hint: { el: "Ιστορικά και περιγραφές στα ελληνικά.", en: "Histories and descriptions in Greek." } },
  translator: { el: "Μεταφραστής", en: "Translator", icon: "🌍", need: 3, hint: { el: "Κείμενα στα αγγλικά.", en: "Texts in English." } },
  researcher: { el: "Ερευνητής πηγών", en: "Source researcher", icon: "📚", need: 3, hint: { el: "Βασικά στοιχεία και πηγές.", en: "Key facts and sources." } },
  photographer: { el: "Φωτογράφος", en: "Photographer", icon: "📷", need: 3, hint: { el: "Φωτογραφίες και βίντεο ναών.", en: "Photos and videos of churches." } },
  archivist: { el: "Αρχειονόμος", en: "Archivist", icon: "🗂️", need: 3, hint: { el: "Παλιές φωτογραφίες.", en: "Old photographs." } },
  mapper: { el: "Χαρτογράφος", en: "Mapper", icon: "🧭", need: 3, hint: { el: "Επαληθευμένες θέσεις στον χάρτη.", en: "Verified locations on the map." } },
  devoted: { el: "Σταθερός συνεργάτης", en: "Steadfast contributor", icon: "⭐", need: 10, hint: { el: "10 εγκεκριμένες προτάσεις.", en: "10 approved proposals." } },
} as const
export type BadgeKey = keyof typeof BADGES

export const LEVEL_NAMES = [
  { el: "Νέος συνεργάτης", en: "New contributor" },
  { el: "Συνεργάτης", en: "Contributor" },
  { el: "Καταγραφέας μνημείων", en: "Heritage recorder" },
  { el: "Χρονικογράφος", en: "Chronicler" },
  { el: "Θεματοφύλακας της μνήμης", en: "Custodian of memory" },
]
export type Level = { min: number; el: string; en: string }
export const levelsFor = (cfg: PointsConfig): Level[] => LEVEL_NAMES.map((n, i) => ({ ...n, min: i ? cfg.levels[i - 1] : 0 }))
export const levelFor = (cfg: PointsConfig, points: number) => [...levelsFor(cfg)].reverse().find((l) => points >= l.min)!
export const nextLevel = (cfg: PointsConfig, points: number) => levelsFor(cfg).find((l) => l.min > points) ?? null

/** Badges earned from a contributor's approved proposals (count + missions and bonuses completed). */
export function badgesFor(approved: number, completed: string[]): BadgeKey[] {
  const byArea: Record<string, number> = {}
  for (const k of normaliseEarned(completed)) {
    const area = MISSIONS.find((m) => m.key === k)?.badge ?? BONUSES[k as BonusKey]?.badge
    if (area) byArea[area] = (byArea[area] ?? 0) + 1
  }
  const out: BadgeKey[] = []
  if (approved >= BADGES.first.need) out.push("first")
  for (const b of ["writer", "translator", "researcher", "photographer", "archivist", "mapper"] as const) {
    if ((byArea[b] ?? 0) >= BADGES[b].need) out.push(b)
  }
  if (approved >= BADGES.devoted.need) out.push("devoted")
  return out
}

/** "Μαρία Τσαγγάρη" → "Μαρία Τ." for public lists. */
export const publicName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/)
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first
}
