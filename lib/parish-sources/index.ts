// Built-in parish importers: each reads one Metropolis website into ImportRow[] (see lib/import-rows.ts).
// Not covered: the Archbishopric (churchofcyprus.org.cy is behind a Cloudflare challenge), Kition (imkitiou.org's
// robots.txt disallows all crawlers) and Karpasia (no website). Arsinoe and Amathus come with Paphos and Limassol.
import type { ParishSource } from "@/lib/import-rows"
import { constantia } from "./constantia"
import { kykkos } from "./kykkos"
import { kyrenia } from "./kyrenia"
import { limassol } from "./limassol"
import { morphou } from "./morphou"
import { paphos } from "./paphos"
import { tamassos } from "./tamassos"
import { trimythous } from "./trimythous"

export const PARISH_SOURCES: ParishSource[] = [constantia, paphos, limassol, trimythous, tamassos, morphou, kykkos, kyrenia]

export const getParishSource = (id: string) => PARISH_SOURCES.find((s) => s.id === id)
