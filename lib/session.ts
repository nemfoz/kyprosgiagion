import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isAdmin, isSuperadmin } from "@/lib/permissions"

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"]

/** For pages: signed-in user or redirect to the login page. */
export async function requireUser(next = "/admin") {
  const session = await getSession()
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`)
  return session.user
}

export class Forbidden extends Error {}

/** For server actions / route handlers: throws if the role is not enough. */
export async function assertRole(level: "approved" | "admin" | "superadmin") {
  const session = await getSession()
  const user = session?.user
  if (!user) throw new Forbidden("Δεν έχετε συνδεθεί.")
  if (level === "superadmin" && !isSuperadmin(user.role)) throw new Forbidden("Μόνο για υπερδιαχειριστές.")
  if (level === "admin" && !isAdmin(user.role)) throw new Forbidden("Μόνο για διαχειριστές.")
  if (level === "approved" && !isAdmin(user.role) && !user.approved) {
    throw new Forbidden("Ο λογαριασμός σας δεν έχει εγκριθεί ακόμα από διαχειριστή.")
  }
  return user
}
