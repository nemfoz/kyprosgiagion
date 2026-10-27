// Greek Orthodox name days and Easter. Fixed days come from data/namedays.json
// (scripts/fetch-namedays.mjs); the Easter-dependent ones are computed per year.
import data from "@/data/namedays.json"
import { slugify, type Lang } from "@/lib/content"
import { trData } from "@/lib/i18n"
import { intlLocale, type Locale } from "@/lib/locales"

type Feast = Record<Lang, string>
type Movable = { offset: number; feast: Feast; names: string[] }
type Moved = { date: string; offsetIfMoved: number; feast: Feast; names: string[] }

const FIXED = data.fixed as Record<string, string[]>
const MOVABLE = data.movable as Movable[]
const MOVED = data.movedAfterEaster as Moved[]

/** A calendar day, without time zone surprises (all arithmetic in UTC). */
export type Day = { y: number; m: number; d: number }

const toUtc = ({ y, m, d }: Day) => Date.UTC(y, m - 1, d)
const fromUtc = (t: number): Day => { const x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() } }
export const addDays = (day: Day, n: number) => fromUtc(toUtc(day) + n * 86_400_000)
const diffDays = (a: Day, b: Day) => Math.round((toUtc(a) - toUtc(b)) / 86_400_000)
const mmdd = ({ m, d }: Day) => `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
export const isoDay = (day: Day) => `${day.y}-${mmdd(day)}`
export const parseDay = (s: string): Day | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null
}

/** Today in Cyprus. */
export function today(): Day {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia" }).format(new Date()).split("-").map(Number)
  return { y, m, d }
}

/** Orthodox Easter Sunday (Julian computus, shown in the Gregorian calendar; valid 1900–2099). */
export function orthodoxEaster(y: number): Day {
  const a = y % 4, b = y % 7, c = y % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  return addDays({ y, m: month, d: day }, 13)
}

export type DayInfo = { day: Day; names: string[]; feasts: Feast[] }

/** Who celebrates on a day, and which movable feast it is. */
export function nameDay(day: Day): DayInfo {
  const easter = orthodoxEaster(day.y)
  const offset = diffDays(day, easter)
  const names: string[] = []
  const feasts: Feast[] = []
  for (const r of MOVABLE) {
    if (r.offset === offset) { feasts.push(r.feast); names.push(...r.names) }
  }
  for (const r of MOVED) {
    const [m, d] = r.date.split("-").map(Number)
    const fixedDay = { y: day.y, m, d }
    const moved = diffDays(fixedDay, easter) <= 0
    const when = moved ? addDays(easter, r.offsetIfMoved) : fixedDay
    if (diffDays(when, day) === 0) { feasts.push(r.feast); names.push(...r.names) }
  }
  names.push(...(FIXED[mmdd(day)] ?? []))
  return { day, names: [...new Set(names)], feasts }
}

/** The movable feasts of a year (and Saint George / Saint Mark), in date order. */
export function movableFeasts(y: number) {
  const easter = orthodoxEaster(y)
  const list = [
    ...MOVABLE.filter((r) => r.names.length || [-48, -42, -7, -2, 0, 39, 49].includes(r.offset))
      .map((r) => ({ day: addDays(easter, r.offset), feast: r.feast, names: r.names })),
    ...MOVED.map((r) => {
      const [m, d] = r.date.split("-").map(Number)
      const fixedDay = { y, m, d }
      return { day: diffDays(fixedDay, easter) <= 0 ? addDays(easter, r.offsetIfMoved) : fixedDay, feast: r.feast, names: r.names }
    }),
  ]
  return list.sort((a, b) => diffDays(a.day, b.day))
}

/** Every day a name is celebrated in a year (accent- and case-insensitive prefix match). */
export function findName(query: string, y: number): DayInfo[] {
  const fold = (s: string) => s.toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "")
  const q = fold(query.trim())
  if (q.length < 2) return []
  const out: DayInfo[] = []
  for (let day: Day = { y, m: 1, d: 1 }; day.y === y; day = addDays(day, 1)) {
    const info = nameDay(day)
    if (info.names.some((n) => fold(n).startsWith(q))) out.push(info)
  }
  return out
}

const MONTHS: Record<Lang, string[]> = {
  el: ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου", "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
}
export const MONTH_NAMES: Record<Lang, string[]> = {
  el: ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"],
  en: MONTHS.en,
}
const capital = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)
/** A month's name ("Απρίλιος", "April", "Апрель"). */
export const monthName = (m: number, lang: Locale) => lang === "el" || lang === "en"
  ? MONTH_NAMES[lang][m - 1]
  : capital(new Intl.DateTimeFormat(intlLocale(lang), { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, m - 1, 1)))
/** "12 Απριλίου" / "12 April" / "12 апреля". */
export const formatDay = (day: Day, lang: Locale, withYear = false) => lang === "el" || lang === "en"
  ? `${day.d} ${MONTHS[lang][day.m - 1]}${withYear ? ` ${day.y}` : ""}`
  : new Intl.DateTimeFormat(intlLocale(lang), { day: "numeric", month: "long", year: withYear ? "numeric" : undefined, timeZone: "UTC" }).format(new Date(toUtc(day)))
export const weekday = (day: Day, lang: Locale) =>
  capital(new Intl.DateTimeFormat(intlLocale(lang), { weekday: "long", timeZone: "UTC" }).format(new Date(toUtc(day))))
/** A feast's name in any language (the extra languages read "data.feast.<english-slug>"). */
export const feastName = (f: Feast, lang: Locale) => trData(`data.feast.${slugify(f.en)}`, f, lang)

/** Yesterday's, today's and tomorrow's names (Cyprus time), for the header bar. */
export function nameDaysAround(lang: Locale) {
  const t = today()
  const info = nameDay(t)
  return {
    yesterday: nameDay(addDays(t, -1)).names,
    today: info.names,
    tomorrow: nameDay(addDays(t, 1)).names,
    feast: info.feasts.map((f) => feastName(f, lang)).join(" · ") || null,
  }
}
