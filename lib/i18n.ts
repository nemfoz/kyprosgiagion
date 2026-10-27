import type { Lang } from "@/lib/content"

// Public-site interface text. (The admin area is in Greek only.)
export const UI = {
  caption: { el: "Ένας χάρτης της εκκλησιαστικής μας κληρονομιάς", en: "An atlas of our sacred heritage" },
  eyebrow: { el: "ΤΟΠΟΙ ΠΙΣΤΗΣ & ΙΣΤΟΡΙΑΣ", en: "PLACES OF FAITH & HISTORY" },
  title: { el: "Ανακαλύψτε την Κύπρο", en: "Discover Cyprus" },
  description: { el: "Εκκλησίες, μοναστήρια και οι ιστορίες τους. Εξερευνήστε την κληρονομιά του τόπου μας.", en: "Churches, monasteries, and the stories they hold. Explore the heritage of our island." },
  hint: { el: "Επιλέξτε ένα μνημείο στον χάρτη", en: "Select a monument to explore" },
  results: { el: "ΣΤΟΝ ΧΑΡΤΗ", en: "ON THE MAP" },
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
  contribute: { el: "Συνεισφέρετε", en: "Contribute" },
  completeness: { el: "Πληρότητα σελίδας", en: "Page completeness" },
  missingTitle: { el: "Τι λείπει", en: "What's missing" },
  helpComplete: { el: "Βοηθήστε να συμπληρωθεί", en: "Help complete it" },
  completeAll: { el: "Η σελίδα είναι πλήρης. Ευχαριστούμε όλους όσοι βοήθησαν!", en: "This page is complete. Thank you to everyone who helped!" },
  pointsShort: { el: "πόντοι", en: "points" },
  signInToHelp: { el: "Συνδεθείτε ή κάντε εγγραφή για να προτείνετε προσθήκες. Κάθε εγκεκριμένη συνεισφορά κερδίζει πόντους.", en: "Sign in or sign up to suggest additions. Every approved contribution earns points." },
} as const

type TextKey = { [K in keyof typeof UI]: (typeof UI)[K]["el"] extends string ? K : never }[keyof typeof UI]

export const t = (key: TextKey, lang: Lang): string => UI[key][lang]

export const langFrom = (v: unknown): Lang => (v === "en" ? "en" : "el")
