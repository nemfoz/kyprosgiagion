// How complete a church's page is, as a checklist of "missions" worth points.
// Shared by the public pages, the editor and the scoring of approved proposals.
import type { Lang, SiteContent } from "@/lib/content"

export type MissionKey =
  | "history_el" | "history_en" | "summary" | "photo" | "photos3" | "location" | "facts" | "sources" | "english"

export type Mission = {
  key: MissionKey
  points: number
  label: Record<Lang, string>
  hint: Record<Lang, string>
  /** Which kind of badge the mission counts towards. */
  badge: "historian" | "photographer" | "explorer" | "scholar" | "translator"
}

export const MISSIONS: Mission[] = [
  { key: "history_el", points: 30, badge: "historian", label: { el: "Ιστορικό (ελληνικά)", en: "History (Greek)" }, hint: { el: "Γράψτε την ιστορία του ναού: χρονολόγηση, αρχιτεκτονική, τοιχογραφίες, τι συνέβη μετά το 1974.", en: "Write the church's history: dating, architecture, wall paintings, what happened after 1974." } },
  { key: "history_en", points: 20, badge: "translator", label: { el: "Ιστορικό (αγγλικά)", en: "History (English)" }, hint: { el: "Μεταφράστε ή γράψτε το ιστορικό στα αγγλικά.", en: "Translate or write the history in English." } },
  { key: "summary", points: 10, badge: "translator", label: { el: "Σύντομη περιγραφή και στις δύο γλώσσες", en: "Short description in both languages" }, hint: { el: "Δύο-τρεις προτάσεις που εμφανίζονται στον χάρτη.", en: "Two or three sentences shown on the map." } },
  { key: "photo", points: 15, badge: "photographer", label: { el: "Φωτογραφία", en: "A photograph" }, hint: { el: "Ανεβάστε μια φωτογραφία του ναού (δική σας ή με άδεια, με αναφορά πηγής).", en: "Upload a photo of the church (your own or with permission, with its source)." } },
  { key: "photos3", points: 10, badge: "photographer", label: { el: "Τουλάχιστον 3 φωτογραφίες", en: "At least 3 photographs" }, hint: { el: "Εξωτερικό, εσωτερικό, λεπτομέρειες, τοιχογραφίες.", en: "Exterior, interior, details, wall paintings." } },
  { key: "location", points: 15, badge: "explorer", label: { el: "Επαληθευμένη θέση", en: "Verified location" }, hint: { el: "Τοποθετήστε το σημάδι ακριβώς πάνω στον ναό, με τη δορυφορική εικόνα.", en: "Place the pin exactly on the church, using the satellite view." } },
  { key: "facts", points: 10, badge: "scholar", label: { el: "Στοιχεία (τουλάχιστον 3)", en: "Details (at least 3)" }, hint: { el: "Π.χ. Χρονολόγηση, Αρχιτεκτονική, Πανήγυρη, Σημερινή κατάσταση.", en: "E.g. Dating, Architecture, Feast day, Present state." } },
  { key: "sources", points: 10, badge: "scholar", label: { el: "Πηγές (τουλάχιστον 2)", en: "Sources (at least 2)" }, hint: { el: "Βιβλία, άρθρα ή ιστοσελίδες από όπου προέρχονται οι πληροφορίες.", en: "Books, articles or websites the information comes from." } },
  { key: "english", points: 5, badge: "translator", label: { el: "Όνομα και τοποθεσία στα αγγλικά", en: "Name and location in English" }, hint: { el: "Για τους ξενόγλωσσους επισκέπτες.", en: "For visitors who don't read Greek." } },
]

export const TOTAL_POINTS = MISSIONS.reduce((n, m) => n + m.points, 0)

// Text the importer and the samples use until someone writes the real history.
const PLACEHOLDER = /θα συμπληρωθεί|will be added|Δείγμα κειμένου|Sample text/i
const realText = (s: string, min: number) => s.trim().length >= min && !PLACEHOLDER.test(s)
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean).length

export type CompletenessInput = { content: SiteContent; coordsVerified: boolean; photoCount: number }

export function missionsDone(s: CompletenessInput): Set<MissionKey> {
  const { el, en } = s.content
  const done = new Set<MissionKey>()
  if (realText(el.body, 400)) done.add("history_el")
  if (realText(en.body, 400)) done.add("history_en")
  if (realText(el.summary, 40) && realText(en.summary, 40)) done.add("summary")
  if (s.photoCount >= 1) done.add("photo")
  if (s.photoCount >= 3) done.add("photos3")
  if (s.coordsVerified) done.add("location")
  if (lines(el.facts) + lines(en.facts) >= 6 || Math.max(lines(el.facts), lines(en.facts)) >= 3) done.add("facts")
  if (Math.max(lines(el.sources), lines(en.sources)) >= 2) done.add("sources")
  if (en.name.trim() && en.location.trim()) done.add("english")
  return done
}

export function completeness(s: CompletenessInput) {
  const done = missionsDone(s)
  const points = MISSIONS.filter((m) => done.has(m.key)).reduce((n, m) => n + m.points, 0)
  return {
    percent: Math.round((points / TOTAL_POINTS) * 100),
    done,
    missing: MISSIONS.filter((m) => !done.has(m.key)),
  }
}

// ---- contributors ----

/** Every approved proposal earns this, plus the points of the missions it completed. */
export const PROPOSAL_POINTS = 5

export const BADGES = {
  first: { el: "Πρώτη συνεισφορά", en: "First contribution", icon: "🕯️", need: 1 },
  historian: { el: "Χρονογράφος", en: "Chronicler", icon: "📜", need: 3 },
  photographer: { el: "Φωτογράφος", en: "Photographer", icon: "📷", need: 3 },
  explorer: { el: "Εξερευνητής", en: "Explorer", icon: "🧭", need: 3 },
  scholar: { el: "Ερευνητής", en: "Researcher", icon: "📚", need: 3 },
  translator: { el: "Μεταφραστής", en: "Translator", icon: "🌍", need: 3 },
  devoted: { el: "Αφοσιωμένος", en: "Devoted", icon: "⭐", need: 10 },
} as const
export type BadgeKey = keyof typeof BADGES

export const LEVELS = [
  { min: 0, el: "Προσκυνητής", en: "Pilgrim" },
  { min: 50, el: "Αναγνώστης", en: "Reader" },
  { min: 150, el: "Χρονογράφος", en: "Chronicler" },
  { min: 400, el: "Λόγιος", en: "Scholar" },
  { min: 1000, el: "Φύλακας της μνήμης", en: "Keeper of memory" },
]
export const levelFor = (points: number) => [...LEVELS].reverse().find((l) => points >= l.min)!
export const nextLevel = (points: number) => LEVELS.find((l) => l.min > points) ?? null

/** Badges earned from a contributor's approved proposals (count + missions completed). */
export function badgesFor(approved: number, completed: MissionKey[]): BadgeKey[] {
  const byBadge: Record<string, number> = {}
  for (const k of completed) {
    const m = MISSIONS.find((x) => x.key === k)
    if (m) byBadge[m.badge] = (byBadge[m.badge] ?? 0) + 1
  }
  const out: BadgeKey[] = []
  if (approved >= BADGES.first.need) out.push("first")
  for (const b of ["historian", "photographer", "explorer", "scholar", "translator"] as const) {
    if ((byBadge[b] ?? 0) >= BADGES[b].need) out.push(b)
  }
  if (approved >= BADGES.devoted.need) out.push("devoted")
  return out
}

/** "Μαρία Τσαγγάρη" → "Μαρία Τ." for public lists. */
export const publicName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/)
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first
}
