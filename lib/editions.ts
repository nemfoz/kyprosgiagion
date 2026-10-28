// Οδοιπορικό is the umbrella brand; each Orthodox Church (country) is an edition under it, with its own
// landing page, map, sees and church pages: /cyprus, /cyprus/map, /cyprus/metropolis/x, /cyprus/site/x.
// Only Cyprus has content so far; the others are listed on the home page as "coming soon".
import type { Lang } from "@/lib/content"
import type { Locale } from "@/lib/locales"
import { trData } from "@/lib/i18n"

/** The brand: Greek in Greek, ODOIPORIKO (never translated) in every other language. */
export const brandName = (l: Locale) => (l === "el" ? "Οδοιπορικό" : "Odoiporiko")

export type Edition = {
  id: string
  /** The country / region. */
  name: Record<Lang, string>
  /** The Church whose churches the edition maps. */
  church: Record<Lang, string>
  active: boolean
}

// The autocephalous Orthodox Churches, in the order of the diptychs.
export const EDITIONS: Edition[] = [
  { id: "constantinople", name: { el: "Κωνσταντινούπολη", en: "Constantinople" }, church: { el: "Οικουμενικό Πατριαρχείο", en: "Ecumenical Patriarchate" }, active: false },
  { id: "alexandria", name: { el: "Αλεξάνδρεια", en: "Alexandria" }, church: { el: "Πατριαρχείο Αλεξανδρείας", en: "Patriarchate of Alexandria" }, active: false },
  { id: "antioch", name: { el: "Αντιόχεια", en: "Antioch" }, church: { el: "Πατριαρχείο Αντιοχείας", en: "Patriarchate of Antioch" }, active: false },
  { id: "jerusalem", name: { el: "Ιεροσόλυμα", en: "Jerusalem" }, church: { el: "Πατριαρχείο Ιεροσολύμων", en: "Patriarchate of Jerusalem" }, active: false },
  { id: "russia", name: { el: "Ρωσία", en: "Russia" }, church: { el: "Εκκλησία της Ρωσίας", en: "Church of Russia" }, active: false },
  { id: "serbia", name: { el: "Σερβία", en: "Serbia" }, church: { el: "Εκκλησία της Σερβίας", en: "Church of Serbia" }, active: false },
  { id: "romania", name: { el: "Ρουμανία", en: "Romania" }, church: { el: "Εκκλησία της Ρουμανίας", en: "Church of Romania" }, active: false },
  { id: "bulgaria", name: { el: "Βουλγαρία", en: "Bulgaria" }, church: { el: "Εκκλησία της Βουλγαρίας", en: "Church of Bulgaria" }, active: false },
  { id: "georgia", name: { el: "Γεωργία", en: "Georgia" }, church: { el: "Εκκλησία της Γεωργίας", en: "Church of Georgia" }, active: false },
  { id: "cyprus", name: { el: "Κύπρος", en: "Cyprus" }, church: { el: "Εκκλησία της Κύπρου", en: "Church of Cyprus" }, active: true },
  { id: "greece", name: { el: "Ελλάδα", en: "Greece" }, church: { el: "Εκκλησία της Ελλάδος", en: "Church of Greece" }, active: false },
  { id: "poland", name: { el: "Πολωνία", en: "Poland" }, church: { el: "Εκκλησία της Πολωνίας", en: "Church of Poland" }, active: false },
  { id: "albania", name: { el: "Αλβανία", en: "Albania" }, church: { el: "Εκκλησία της Αλβανίας", en: "Church of Albania" }, active: false },
  { id: "czech-slovakia", name: { el: "Τσεχία και Σλοβακία", en: "Czech Lands and Slovakia" }, church: { el: "Εκκλησία Τσεχίας και Σλοβακίας", en: "Church of the Czech Lands and Slovakia" }, active: false },
]

export const editionName = (e: Edition, l: Locale) => trData(`data.edition.${e.id}`, e.name, l)
export const editionChurch = (e: Edition, l: Locale) => trData(`data.church.${e.id}`, e.church, l)
/** Every region (data/regions.json) belongs to the Cyprus edition for now. */
export const CYPRUS = EDITIONS.find((e) => e.id === "cyprus")!

// Addresses of the Cyprus edition's pages (without the language prefix: wrap them in localePath).
export const paths = {
  home: "/cyprus",
  map: "/cyprus/map",
  site: (slug: string) => `/cyprus/site/${encodeURIComponent(slug)}`,
  /** The map with a church selected. */
  onMap: (slug: string) => `/cyprus/map?site=${encodeURIComponent(slug)}`,
  metropolises: "/cyprus/metropolis",
  metropolis: (slug: string) => `/cyprus/metropolis/${encodeURIComponent(slug)}`,
}
