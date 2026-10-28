import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isAdmin, isSuperadmin } from "@/lib/permissions"
import type { MessageKey, Vars } from "@/lib/i18n"

/** The signed-in user's session, looked up once per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }))

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"]

/** For pages: signed-in user or redirect to the login page. */
export async function requireUser(next = "/admin") {
  const session = await getSession()
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`)
  return session.user
}

/** A message for the user, as a text key (+ placeholders); translated where it reaches the UI. */
export type ErrorMessage = { key: MessageKey; vars?: Vars }

/** An error meant for the user: one or more text keys, shown in the admin language by the action wrapper. */
export class UserError extends Error {
  messages: ErrorMessage[]
  constructor(key: MessageKey | ErrorMessage[], vars?: Vars) {
    const messages = Array.isArray(key) ? key : [{ key, vars }]
    super(messages.map((m) => m.key).join(" "))
    this.messages = messages
  }
}

export class Forbidden extends UserError {}

/** For server actions / route handlers: throws if the role is not enough. */
export async function assertRole(level: "approved" | "admin" | "superadmin") {
  const session = await getSession()
  const user = session?.user
  if (!user) throw new Forbidden("error.notSignedIn")
  if (level === "superadmin" && !isSuperadmin(user.role)) throw new Forbidden("error.superadminOnly")
  if (level === "admin" && !isAdmin(user.role)) throw new Forbidden("error.adminOnly")
  if (level === "approved" && !isAdmin(user.role) && !user.approved) {
    throw new Forbidden("error.noProposalRight")
  }
  return user
}
