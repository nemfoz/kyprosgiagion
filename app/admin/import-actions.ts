"use server"

import { revalidatePath, updateTag } from "next/cache"
import { PUBLIC_TAG } from "@/lib/cache"
import { check, commit, MAX_ROWS, type ImportDefaults } from "@/lib/church-import"
import { getAdminT } from "@/lib/i18n-server"
import { getParishSource } from "@/lib/parish-sources"
import { assertRole, UserError } from "@/lib/session"

// Adding churches in bulk (superadmins): check rows → preview → commit the chosen ones.
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    await assertRole("superadmin")
    return { ok: true, ...(await fn()) }
  } catch (e) {
    const t = await getAdminT()
    if (e instanceof UserError) return { ok: false, error: e.messages.map((m) => t(m.key, m.vars)).join(" ") }
    console.error(e)
    return { ok: false, error: t("error.generic") }
  }
}

const rowsOf = (rows: unknown) => {
  if (!Array.isArray(rows) || rows.length === 0) throw new UserError("import.error.noRows")
  if (rows.length > MAX_ROWS) throw new UserError("import.error.tooMany", { n: MAX_ROWS })
  return rows.filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
}
const defaultsOf = (d: Partial<ImportDefaults>): ImportDefaults => ({ region: String(d?.region ?? ""), see: d?.see ? String(d.see) : null, published: !!d?.published })

export async function checkImportAction(rows: unknown, defaults: Partial<ImportDefaults>) {
  return run(async () => ({ rows: await check(rowsOf(rows), defaultsOf(defaults)) }))
}

export async function commitImportAction(rows: unknown, defaults: Partial<ImportDefaults>, allowDuplicates = false) {
  return run(async () => {
    const r = await commit(rowsOf(rows), defaultsOf(defaults), { allowDuplicates })
    if (r.added.length) {
      updateTag(PUBLIC_TAG)
      revalidatePath("/", "layout")
    }
    return r
  })
}

/** Reads a Metropolis website's parish list (lib/parish-sources) into rows for the preview. */
export async function fetchParishesAction(sourceId: string) {
  return run(async () => {
    const source = getParishSource(sourceId)
    if (!source) throw new UserError("import.error.source")
    const log: string[] = []
    const rows = await source.fetch({ log: (m) => log.push(m), signal: AbortSignal.timeout(280_000) })
    return { rows: rows.map((r) => ({ ...r, region: r.region || source.region || "", see: r.see || source.see })), log: log.slice(-30) }
  })
}
