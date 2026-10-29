import "server-only"
import { notFound } from "next/navigation"
import { DEFAULT_EDITION, editionPaths, type Edition } from "@/lib/editions"
import { getEdition, getEditions } from "@/lib/editions-server"
import { isAdmin } from "@/lib/permissions"
import { editionRegions } from "@/lib/regions-server"
import { getSession } from "@/lib/session"

/**
 * The edition of an /[edition]/… page, its addresses and active regions — or a 404. An edition that isn't
 * active yet can only be opened by admins (to prepare it); `forMetadata` skips that check (no session needed).
 */
export async function editionPage(id: string, { forMetadata = false } = {}) {
  const edition = await getEdition(id)
  if (!edition) notFound()
  if (!edition.active && !forMetadata) {
    const session = await getSession()
    if (!isAdmin(session?.user.role)) notFound()
  }
  return { edition, paths: editionPaths(edition.id), regions: await editionRegions(edition.id) }
}

/** The edition a page outside any edition links to: the given one, else the default, else the first active. */
export async function linkedEdition(id?: string): Promise<Edition | null> {
  const all = await getEditions()
  return all.find((e) => e.id === (id ?? DEFAULT_EDITION)) ?? all.find((e) => e.active) ?? null
}
