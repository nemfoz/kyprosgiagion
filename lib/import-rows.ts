// One church to import, from a spreadsheet (admin bulk import) or a Metropolis website (lib/parish-sources).
// Rows are checked and shown in a preview before anything is written (lib/church-import.ts).
import type { SiteType } from "@/lib/content"

export type ImportRow = {
  /** Greek name, e.g. "Ιερός Ναός Αγίου Γεωργίου" (required). */
  name_el: string
  name_en?: string
  type?: SiteType
  /** Village / town / quarter, e.g. "Γαϊδουράς" / "Gaidouras". */
  location_el?: string
  location_en?: string
  /** Region id (e.g. "famagusta"); the import form's default is used when empty. */
  region?: string
  /** See (metropolis) slug, e.g. "paphos"; the import form's default is used when empty. */
  see?: string
  lat?: number
  lng?: number
  /** A Google Maps link (full or maps.app.goo.gl) — turned into lat/lng when those are missing. */
  map_url?: string
  /** "exact" (a pin on the church itself — the location counts as verified) or "approximate" (e.g. the village centre). */
  coords?: "exact" | "approximate"
  summary_el?: string
  summary_en?: string
  /** A photo on the source website — downloaded and stored (never hotlinked). */
  image?: string
  /** The page the information came from (shown as the source link). */
  source?: string
  /** The source's name for the link, e.g. "Ιερά Μητρόπολη Πάφου". */
  source_label?: string
}

/** A website importer: reads a Metropolis's parish list into rows. */
export type ParishSource = {
  id: string
  /** The see (metropolis slug) the parishes belong to. */
  see: string
  label: { el: string; en: string }
  /** The page the list is read from. */
  url: string
  /** Default region id for rows without one. */
  region?: string
  /** Notes for the admin (what is and isn't read, known gaps). */
  note?: string
  fetch(opts?: { log?: (m: string) => void; signal?: AbortSignal }): Promise<ImportRow[]>
}
