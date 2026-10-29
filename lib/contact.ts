import "server-only"
import crypto from "node:crypto"
import { and, desc, eq, gt, or, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { isDisposableEmail } from "@/lib/antispam"
import { sendEmail } from "@/lib/email"
import { getSiteInfo } from "@/lib/site-info"
import { SITE_URL } from "@/lib/seo"
import { UserError } from "@/lib/session"

// Messages from the contact form (/contact): kept for the admins' inbox (/admin/messages) and, when e-mail is
// set up (Resend), also sent to the contact address with Reply-To set to the sender.
const { contactMessages } = schema

export const TOPICS = ["general", "correction", "photos", "edition", "press", "other"] as const
export type Topic = (typeof TOPICS)[number]
export const HOURLY_LIMIT = 4

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

/** The sender's address as a salted hash: enough to limit messages per hour, without keeping the address. */
export const ipHash = (ip: string) => crypto.createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || "contact"}:${ip}`).digest("hex").slice(0, 32)

export type ContactInput = { name: string; email: string; topic: string; subject: string; body: string; lang: string }

export async function saveContactMessage(raw: ContactInput, meta: { userId: string | null; ip: string }) {
  const name = String(raw.name ?? "").trim().slice(0, 120)
  const email = String(raw.email ?? "").trim().toLowerCase().slice(0, 200)
  const topic: Topic = TOPICS.includes(raw.topic as Topic) ? (raw.topic as Topic) : "general"
  const subject = String(raw.subject ?? "").trim().slice(0, 200)
  const body = String(raw.body ?? "").trim().slice(0, 5000)
  const errors = [
    ...(!name ? [{ key: "contactErrName" as const }] : []),
    ...(!EMAIL.test(email) || isDisposableEmail(email) ? [{ key: "contactErrEmail" as const }] : []),
    ...(body.length < 10 ? [{ key: "contactErrBody" as const }] : []),
  ]
  if (errors.length) throw new UserError(errors)

  const hash = ipHash(meta.ip)
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(contactMessages)
    .where(and(gt(contactMessages.createdAt, sql`datetime('now', '-1 hour')`), or(eq(contactMessages.ipHash, hash), eq(contactMessages.email, email))))
  if (Number(n) >= HOURLY_LIMIT) throw new UserError("contactErrLimit")

  const lang = raw.lang === "el" ? "el" : String(raw.lang ?? "en").slice(0, 5)
  const [row] = await db.insert(contactMessages).values({ name, email, topic, subject, body, lang, userId: meta.userId, ipHash: hash }).returning({ id: contactMessages.id })

  // Forward to the contact address when e-mail sending is set up; the inbox keeps it either way.
  if (process.env.RESEND_API_KEY) {
    const info = await getSiteInfo()
    const link = `${SITE_URL}/admin/messages`
    await sendEmail({
      to: info.contactEmail, replyTo: email,
      subject: `[Οδοιπορικό] ${subject || topic} — ${name}`,
      text: `${name} <${email}> · ${topic}\n\n${body}\n\n${link}`,
      html: `<p><b>${escape(name)}</b> &lt;${escape(email)}&gt; · ${escape(topic)}</p><p style="white-space:pre-wrap">${escape(body)}</p><p><a href="${link}">${link}</a></p>`,
    }).then(() => db.update(contactMessages).set({ emailed: true }).where(eq(contactMessages.id, row.id)), (e) => console.error("contact e-mail failed:", e))
  }
  return row.id
}

export async function listContactMessages(status?: "new" | "read" | "done") {
  return db.select().from(contactMessages).where(status ? eq(contactMessages.status, status) : undefined).orderBy(desc(contactMessages.createdAt)).limit(500)
}

export async function unreadContactMessages() {
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(contactMessages).where(eq(contactMessages.status, "new"))
  return Number(n)
}

export async function setContactStatus(id: number, status: "new" | "read" | "done", by: string) {
  await db.update(contactMessages).set({ status, handledBy: status === "new" ? null : by, handledAt: status === "new" ? null : sql`(datetime('now'))` }).where(eq(contactMessages.id, id))
}

export async function deleteContactMessage(id: number) {
  await db.delete(contactMessages).where(eq(contactMessages.id, id))
}
