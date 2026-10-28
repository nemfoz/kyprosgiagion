"use server"

import { revalidatePath, updateTag } from "next/cache"
import { PUBLIC_TAG } from "@/lib/cache"
import { getAdminT } from "@/lib/i18n-server"
import { deleteMetropolis, getMetropolis, normaliseMetroContent, refreshNews, saveMetropolis } from "@/lib/metropolises"
import { assertRole, UserError } from "@/lib/session"
import { isStored, rehostImage } from "@/lib/storage"
import { slugify } from "@/lib/content"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) }
  } catch (e) {
    const t = await getAdminT()
    if (e instanceof UserError) return { ok: false, error: e.messages.map((m) => t(m.key, m.vars)).join(" ") }
    console.error(e)
    return { ok: false, error: t("error.generic") }
  }
}

const refresh = () => {
  updateTag(PUBLIC_TAG)
  revalidatePath("/metropolis", "layout")
  revalidatePath("/admin/metropolises", "layout")
}
const httpUrl = (s: unknown) => { const v = String(s ?? "").trim(); return /^https?:\/\/\S+$/.test(v) ? v : "" }

export type MetroFormValues = { slug: string; sort: number; website: string; feedUrl: string; logo: string; content: unknown }

/** Admins: creates or updates a Metropolis. A logo given as a link is copied into our storage (never hotlinked). */
export async function saveMetropolisAction(id: number | null, v: MetroFormValues) {
  return run(async () => {
    await assertRole("admin")
    const content = normaliseMetroContent(v.content)
    if (!content.el.name && !content.en.name) throw new UserError("metro.error.name")
    const slug = slugify(v.slug || content.en.name)
    if (!slug) throw new UserError("metro.error.slug")
    const other = await getMetropolis({ slug })
    if (other && other.id !== id) throw new UserError("metro.error.slugTaken", { slug })
    let logo = String(v.logo ?? "").trim()
    if (logo && !isStored(logo)) {
      if (!httpUrl(logo)) throw new UserError("metro.error.logo")
      logo = await rehostImage(logo, `metropolis-${slug}`)
    }
    const saved = await saveMetropolis(id, {
      slug, sort: Math.trunc(Number(v.sort) || 0), website: httpUrl(v.website), feedUrl: httpUrl(v.feedUrl), logo, content,
    })
    refresh()
    return { id: saved, logo }
  })
}

export async function deleteMetropolisAction(id: number) {
  return run(async () => {
    await assertRole("admin")
    await deleteMetropolis(id)
    refresh()
    return {}
  })
}

/** Reads the feed now; returns how many items it had. */
export async function refreshNewsAction(id: number) {
  return run(async () => {
    await assertRole("admin")
    const m = await getMetropolis({ id })
    if (!m?.feedUrl) throw new UserError("metro.error.noFeed")
    let count: number
    try { count = await refreshNews(m) } catch (e) {
      throw new UserError("metro.error.feed", { error: (e as Error).message })
    }
    refresh()
    return { count }
  })
}
