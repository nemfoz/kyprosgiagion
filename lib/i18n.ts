import type { Lang } from "@/lib/content"

// Public-site interface text. (The admin area is in Greek only.)
export const UI = {
  search: { el: "Αναζήτηση εκκλησίας ή χωριού…", en: "Search a church or village…" },
  count: { el: (n: number) => `${n} ${n === 1 ? "μνημείο" : "μνημεία"}`, en: (n: number) => `${n} ${n === 1 ? "monument" : "monuments"}` },
  none: { el: "Δεν βρέθηκαν αποτελέσματα.", en: "No results." },
  more: { el: "Δείτε ολόκληρη τη σελίδα", en: "View full page" },
  back: { el: "Όλα τα μνημεία", en: "All monuments" },
  approx: { el: "Κατά προσέγγιση θέση – δεν έχει επαληθευτεί ακόμα.", en: "Approximate location – not yet verified." },
  backToMap: { el: "Πίσω στον χάρτη", en: "Back to the map" },
  details: { el: "Στοιχεία", en: "Details" },
  location: { el: "Τοποθεσία", en: "Location" },
  type: { el: "Τύπος", en: "Type" },
  coords: { el: "Συντεταγμένες", en: "Coordinates" },
  openMaps: { el: "Άνοιγμα στο Google Maps", en: "Open in Google Maps" },
  photos: { el: "Φωτογραφίες", en: "Photographs" },
  photoSource: { el: "Πηγή φωτογραφίας", en: "Photo source" },
  sources: { el: "Πηγές", en: "Sources" },
  draft: { el: "Μη δημοσιευμένο – προεπισκόπηση διαχειριστή", en: "Unpublished – admin preview" },
  edit: { el: "Επεξεργασία", en: "Edit" },
  propose: { el: "Πρόταση αλλαγής", en: "Suggest a change" },
  signIn: { el: "Σύνδεση", en: "Sign in" },
  dashboard: { el: "Διαχείριση", en: "Dashboard" },
  map: { el: "Χάρτης", en: "Map" },
  satellite: { el: "Δορυφόρος", en: "Satellite" },
} as const

type TextKey = { [K in keyof typeof UI]: (typeof UI)[K]["el"] extends string ? K : never }[keyof typeof UI]

export const t = (key: TextKey, lang: Lang): string => UI[key][lang]

export const langFrom = (v: unknown): Lang => (v === "en" ? "en" : "el")
