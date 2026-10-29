import { notFound } from "next/navigation"
import { MessagesInbox } from "@/components/admin/messages-inbox"
import { listContactMessages } from "@/lib/contact"
import { getAdminT } from "@/lib/i18n-server"
import { isAdmin } from "@/lib/permissions"
import { getSiteInfo } from "@/lib/site-info"
import { requireUser } from "@/lib/session"

/** Messages from the contact form (admins). */
export default async function MessagesPage() {
  const me = await requireUser()
  if (!isAdmin(me.role)) notFound()
  const [t, list, info] = await Promise.all([getAdminT(), listContactMessages(), getSiteInfo()])
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("admin.nav.messages")}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{t(process.env.RESEND_API_KEY ? "msg.introEmail" : "msg.introNoEmail", { email: info.contactEmail })}</p>
      <MessagesInbox messages={list.map((m) => ({ id: m.id, name: m.name, email: m.email, topic: m.topic, subject: m.subject, body: m.body, lang: m.lang, status: m.status as "new" | "read" | "done", createdAt: m.createdAt, emailed: m.emailed }))} />
    </div>
  )
}
