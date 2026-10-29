import type { ImportRow } from "@/lib/import-rows"

// The import's columns and the header names a spreadsheet may use for them (Greek or English, any case).
export const COLUMNS: { key: keyof ImportRow; aliases: string[] }[] = [
  { key: "name_el", aliases: ["name_el", "όνομα", "ονομα", "ναός", "ναος", "ονομασία", "name el", "greek name"] },
  { key: "name_en", aliases: ["name_en", "name", "english name", "name en", "όνομα (αγγλικά)"] },
  { key: "type", aliases: ["type", "τύπος", "τυπος", "είδος"] },
  { key: "location_el", aliases: ["location_el", "χωριό", "χωριο", "κοινότητα", "τοποθεσία", "τοποθεσια", "village", "place", "location"] },
  { key: "location_en", aliases: ["location_en", "village_en", "place_en", "location en"] },
  { key: "region", aliases: ["region", "περιοχή", "περιοχη", "επαρχία", "district"] },
  { key: "see", aliases: ["see", "metropolis", "μητρόπολη", "μητροπολη"] },
  { key: "lat", aliases: ["lat", "latitude", "πλάτος", "γεωγραφικό πλάτος"] },
  { key: "lng", aliases: ["lng", "lon", "long", "longitude", "μήκος", "γεωγραφικό μήκος"] },
  { key: "map_url", aliases: ["map_url", "map", "google maps", "maps", "χάρτης", "link", "σύνδεσμος χάρτη"] },
  { key: "coords", aliases: ["coords", "accuracy", "ακρίβεια"] },
  { key: "summary_el", aliases: ["summary_el", "περιγραφή", "περιγραφη", "summary"] },
  { key: "summary_en", aliases: ["summary_en", "description", "description_en"] },
  { key: "image", aliases: ["image", "photo", "φωτογραφία", "φωτογραφια", "image_url", "photo_url"] },
  { key: "source", aliases: ["source", "πηγή", "πηγη", "source_url", "url"] },
  { key: "source_label", aliases: ["source_label", "όνομα πηγής", "source name"] },
]

const norm = (s: string) => s.trim().toLowerCase().normalize("NFC")

/** Rows (first line = headers) → import rows, and the headers that weren't recognised. */
export function rowsFromTable(table: string[][]): { rows: Record<string, string>[]; unknown: string[] } {
  const [head = [], ...body] = table
  const keys = head.map((h) => COLUMNS.find((c) => c.aliases.some((a) => norm(a) === norm(h)))?.key ?? null)
  return {
    rows: body.map((cells) => Object.fromEntries(keys.flatMap((k, i) => (k && cells[i]?.trim() ? [[k, cells[i].trim()]] : [])))),
    unknown: head.filter((_, i) => !keys[i] && head[i].trim()),
  }
}
