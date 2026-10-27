"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { assertRole, UserError } from "@/lib/session"
import { getAdminT } from "@/lib/i18n-server"
import { isAdmin } from "@/lib/permissions"
import {
  addPhoto, addVideo, createSite, deletePhoto, deleteSite, deleteVideo, getSite, reorderPhotos, slugTaken, updatePhoto,
  updateSite, updateVideo, validateSite, type PhotoInput, type VideoInput,
} from "@/lib/sites"
import { youtubeId } from "@/lib/content"
import { savePointsConfig } from "@/lib/points"
import { approveSubmission, createSubmission, rejectSubmission } from "@/lib/submissions"
import { rehostImage, isStored } from "@/lib/storage"

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
    if (errors.length) throw new UserError(errors)
    if (await slugTaken(data.slug, id ?? undefined)) throw new UserError("error.site.slugTaken", { slug: data.slug })
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

const cleanVideos = (videos: VideoInput[]) => videos.filter((v) => youtubeId(v.youtubeId) === v.youtubeId).slice(0, 20).map((v) => ({
  youtubeId: v.youtubeId, titleEl: String(v.titleEl ?? "").slice(0, 200), titleEn: String(v.titleEn ?? "").slice(0, 200),
}))

export async function proposeAction(siteId: number | null, raw: Record<string, unknown>, photos: PhotoInput[], videos: VideoInput[], note: string) {
  return run(async () => {
    const user = await assertRole("approved")
    const current = siteId ? await getSite({ id: siteId }) : null
    if (siteId && !current) throw new UserError("error.site.notFound")
    const { errors, data } = validateSite({
      ...raw,
      // Only admins decide these:
      slug: current?.slug ?? raw.slug,
      published: current?.published ?? false,
      coordsVerified: current?.coordsVerified ?? false,
    })
    if (errors.length) throw new UserError(errors)
    const cleanPhotos = photos.filter((p) => isStored(p.src)).map((p) => ({
      src: p.src, captionEl: p.captionEl ?? "", captionEn: p.captionEn ?? "", credit: p.credit ?? "", sourceUrl: p.sourceUrl ?? "", historic: !!p.historic,
    }))
    const id = await createSubmission({
      kind: current ? "update" : "create", siteId: current?.id ?? null,
      payload: { site: data, photos: cleanPhotos, videos: cleanVideos(videos) }, note: note.slice(0, 2000), authorId: user.id,
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

export async function updatePhotoAction(id: number, fields: { captionEl: string; captionEn: string; credit: string; sourceUrl: string; historic: boolean }) {
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
    if (!/^https?:\/\//.test(url)) throw new UserError("error.image.urlScheme")
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

// ---- videos (YouTube links, admins attach directly; users add them to proposals) ----

export async function addVideoAction(siteId: number, url: string) {
  return run(async () => {
    await assertRole("admin")
    const id = youtubeId(url)
    if (!id) throw new UserError("error.video.notYoutube")
    const video = await addVideo(siteId, { youtubeId: id })
    refresh((await getSite({ id: siteId }))?.slug)
    return { video }
  })
}

export async function updateVideoAction(id: number, fields: { titleEl: string; titleEn: string }) {
  return run(async () => {
    await assertRole("admin")
    await updateVideo(id, { titleEl: fields.titleEl.slice(0, 200), titleEn: fields.titleEn.slice(0, 200) })
    refresh()
    return {}
  })
}

export async function deleteVideoAction(id: number) {
  return run(async () => {
    await assertRole("admin")
    await deleteVideo(id)
    refresh()
    return {}
  })
}

// ---- points (superadmins) ----

/** Saves the point values and recalculates everyone's points with them. */
export async function savePointsAction(raw: unknown) {
  return run(async () => {
    const user = await assertRole("superadmin")
    const recalculated = await savePointsConfig(raw, user.id)
    revalidatePath("/", "layout")
    return { recalculated }
  })
}
