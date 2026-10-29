"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { HONEYPOT_FIELD, MIN_FORM_SECONDS } from "@/lib/antispam"
import { saveContactMessage, type ContactInput } from "@/lib/contact"
import { getSession, UserError } from "@/lib/session"

type Result = { ok: true } | { ok: false; errors: string[] }

// Cloudflare Turnstile, when the keys are set (otherwise the honeypot, the fill time and the hourly limit).
async function humanEnough(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip }), signal: AbortSignal.timeout(8000),
  }).then((r) => r.json() as Promise<{ success?: boolean }>).catch(() => ({ success: false }))
  return !!res.success
}

/** The contact form. Errors come back as text keys for the page's language. */
export async function sendContactAction(input: ContactInput & { startedAt: number; token?: string; [HONEYPOT_FIELD]?: string }): Promise<Result> {
  const h = await headers()
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "local"
  // Bots: a filled hidden field or a form sent within seconds looks sent, but is dropped.
  const age = (Date.now() - Number(input.startedAt)) / 1000
  if (input[HONEYPOT_FIELD] || !Number.isFinite(age) || age < MIN_FORM_SECONDS) return { ok: true }
  if (!(await humanEnough(String(input.token ?? ""), ip))) return { ok: false, errors: ["contactErrCaptcha"] }
  try {
    const session = await getSession()
    await saveContactMessage(input, { userId: session?.user.id ?? null, ip })
    revalidatePath("/admin", "layout")
    return { ok: true }
  } catch (e) {
    if (e instanceof UserError) return { ok: false, errors: e.messages.map((m) => m.key) }
    console.error(e)
    return { ok: false, errors: ["error.generic"] }
  }
}
