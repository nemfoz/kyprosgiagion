"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"
import { markVisit, removeVisit, setPublicProfile } from "@/lib/visits"

// The signed-in user's own visits and profile setting. Errors come back as text keys for the page's language.
type Result = { ok: true; verified?: boolean } | { ok: false; error: "error.notSignedIn" | "visitTooFar" | "error.generic"; metres?: number; radius?: number }

async function userId() {
  return (await getSession())?.user.id ?? null
}

/** "I'm here" (with the browser's position) or "I've been here before" (without). The position isn't stored. */
export async function markVisitAction(siteId: number, at?: { lat: number; lng: number; accuracy: number }): Promise<Result> {
  const uid = await userId()
  if (!uid) return { ok: false, error: "error.notSignedIn" }
  const valid = at && [at.lat, at.lng, at.accuracy].every(Number.isFinite)
  try {
    const r = await markVisit(uid, Number(siteId), valid ? at : undefined)
    if (!r.ok) return { ok: false, error: "visitTooFar", metres: Math.round(r.metres), radius: r.radius }
    revalidatePath("/profile")
    return { ok: true, verified: r.verified }
  } catch (e) {
    console.error(e)
    return { ok: false, error: "error.generic" }
  }
}

export async function removeVisitAction(siteId: number): Promise<Result> {
  const uid = await userId()
  if (!uid) return { ok: false, error: "error.notSignedIn" }
  await removeVisit(uid, Number(siteId))
  revalidatePath("/profile")
  return { ok: true }
}

export async function setPublicProfileAction(on: boolean): Promise<Result> {
  const uid = await userId()
  if (!uid) return { ok: false, error: "error.notSignedIn" }
  await setPublicProfile(uid, !!on)
  revalidatePath("/profile")
  return { ok: true }
}
