"use server"

import { revalidatePath } from "next/cache"
import { deleteContactMessage, setContactStatus } from "@/lib/contact"
import { assertRole } from "@/lib/session"

// The contact form's inbox (admins).
export async function setMessageStatusAction(id: number, status: "new" | "read" | "done") {
  const user = await assertRole("admin")
  if (!["new", "read", "done"].includes(status)) return { ok: false }
  await setContactStatus(Number(id), status, user.id)
  revalidatePath("/admin", "layout")
  return { ok: true }
}

export async function deleteMessageAction(id: number) {
  await assertRole("admin")
  await deleteContactMessage(Number(id))
  revalidatePath("/admin", "layout")
  return { ok: true }
}
