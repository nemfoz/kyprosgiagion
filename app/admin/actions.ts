"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { assertRole, Forbidden } from "@/lib/session"
import { isAdmin } from "@/lib/permissions"
import {
  addPhoto, createSite, deletePhoto, deleteSite, getSite, reorderPhotos, slugTaken, updatePhoto, updateSite, validateSite,
  type PhotoInput,
} from "@/lib/sites"
import { approveSubmission, createSubmission, rejectSubmission } from "@/lib/submissions"
import { rehostImage, isStored } from "@/lib/storage"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) }
  } catch (e) {
    if (e instanceof Forbidden) return { ok: false, error: e.message }
    console.error(e)
    return { ok: false, error: e instanceof Error ? e.message : "Κάτι πήγε στραβά." }
  }
}

const refresh = (slug?: string) => {
  revalidatePath("/")
  revalidatePath("/admin", "layout")
  if (slug) revalidatePath(`/site/${slug}`)
}

// ---- churches (admins edit directly) ----

export async function saveSiteAction(id: number | null, raw: Record<string, unknown>) {
  return run(async () => {
    await assertRole("admin")
    const { errors, data } = validateSite(raw)
    if (errors.length) throw new Error(errors.join(" "))
    if (await slugTaken(data.slug, id ?? undefined)) throw new Error(`Η διεύθυνση «${data.slug}» χρησιμοποιείται ήδη.`)
    let siteId = id
    if (id) await updateSite(id, data)
    else siteId = await createSite(data)
    refresh(data.slug)
    return { id: siteId! }
  })
}

export async function deleteSiteAction(id: number) {
  return run(async () => {
    await assertRole("admin")
    const site = await getSite({ id })
    await deleteSite(id)
    refresh(site?.slug)
    return {}
  })
}

// ---- proposals (approved users) ----

export async function proposeAction(siteId: number | null, raw: Record<string, unknown>, photos: PhotoInput[], note: string) {
  return run(async () => {
    const user = await assertRole("approved")
    const current = siteId ? await getSite({ id: siteId }) : null
    if (siteId && !current) throw new Error("Η εκκλησία δεν βρέθηκε.")
    const { errors, data } = validateSite({
      ...raw,
      // Only admins decide these:
      slug: current?.slug ?? raw.slug,
      published: current?.published ?? false,
      coordsVerified: current?.coordsVerified ?? false,
    })
    if (errors.length) throw new Error(errors.join(" "))
    const cleanPhotos = photos.filter((p) => isStored(p.src)).map((p) => ({
      src: p.src, captionEl: p.captionEl ?? "", captionEn: p.captionEn ?? "", credit: p.credit ?? "", sourceUrl: p.sourceUrl ?? "",
    }))
    const id = await createSubmission({
      kind: current ? "update" : "create", siteId: current?.id ?? null,
      payload: { site: data, photos: cleanPhotos }, note: note.slice(0, 2000), authorId: user.id,
    })
    revalidatePath("/admin", "layout")
    return { id }
  })
}

export async function reviewSubmissionAction(id: number, decision: "approve" | "reject", reviewNote: string, publish: boolean, verifyLocation = false) {
  return run(async () => {
    const user = await assertRole("admin")
    if (decision === "approve") {
      const siteId = await approveSubmission(id, user.id, reviewNote, publish, verifyLocation)
      const site = await getSite({ id: siteId })
      refresh(site?.slug)
      return { siteId }
    }
    await rejectSubmission(id, user.id, reviewNote)
    revalidatePath("/admin", "layout")
    return {}
  })
}

// ---- photos ----

export async function updatePhotoAction(id: number, fields: { captionEl: string; captionEn: string; credit: string; sourceUrl: string }) {
  return run(async () => {
    await assertRole("admin")
    await updatePhoto(id, fields)
    refresh()
    return {}
  })
}

export async function deletePhotoAction(id: number) {
  return run(async () => {
    await assertRole("admin")
    await deletePhoto(id)
    refresh()
    return {}
  })
}

export async function reorderPhotosAction(siteId: number, ids: number[]) {
  return run(async () => {
    await assertRole("admin")
    await reorderPhotos(siteId, ids)
    refresh()
    return {}
  })
}

/** Copies an image from another website into our storage (never hotlinked). Admins can attach it directly. */
export async function importPhotoAction(url: string, siteId: number | null, credit: string) {
  return run(async () => {
    const user = await assertRole("approved")
    if (!/^https?:\/\//.test(url)) throw new Error("Η διεύθυνση πρέπει να ξεκινά με http:// ή https://")
    const src = await rehostImage(url, "imported")
    const photo: PhotoInput = { src, credit, sourceUrl: url }
    if (siteId && isAdmin(user.role)) {
      const row = await addPhoto(siteId, photo)
      refresh()
      return { photo: row }
    }
    return { pending: photo }
  })
}

// ---- accounts (activated by e-mail confirmation; superadmins manage roles through Better Auth's admin API) ----

/** Superadmins: confirm an address by hand (e.g. the user never received the e-mail). Also activates the account. */
export async function setVerifiedAction(userId: string) {
  return run(async () => {
    await assertRole("superadmin")
    await db.update(schema.user).set({ emailVerified: true, approved: true, updatedAt: new Date() }).where(eq(schema.user.id, userId))
    revalidatePath("/admin", "layout")
    return {}
  })
}

/** Admins: take away / give back a user's right to send proposals. */
export async function setApprovedAction(userId: string, approved: boolean) {
  return run(async () => {
    await assertRole("admin")
    await db.update(schema.user).set({ approved, updatedAt: new Date() }).where(eq(schema.user.id, userId))
    revalidatePath("/admin", "layout")
    return {}
  })
}
