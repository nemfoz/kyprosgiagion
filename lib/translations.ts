import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { setLocaleText } from "@/lib/i18n-server"
import { EXTRA_LOCALES, type ExtraLocale } from "@/lib/locales"
import { UserError } from "@/lib/session"
import { translatableTexts } from "@/lib/translatable"

// Users' fixes to the interface text in the extra languages. An admin approves (the text becomes an override,
// see lib/i18n-server.ts) or rejects each one.
const { translationSuggestions: ts, user } = schema

const MAX_PENDING_PER_USER = 200

export async function suggestTranslation(input: { key: string; locale: string; text: string; note?: string }, authorId: string) {
  const locale = input.locale as ExtraLocale
  const text = input.text.trim().slice(0, 2000)
  if (!EXTRA_LOCALES.includes(locale) || !(await translatableTexts()).some((x) => x.key === input.key)) throw new UserError("error.translation.unknown")
  if (!text) throw new UserError("error.translation.empty")
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(ts).where(and(eq(ts.authorId, authorId), eq(ts.status, "pending")))
  if (Number(n) >= MAX_PENDING_PER_USER) throw new UserError("error.translation.tooMany")
  // A newer suggestion for the same text by the same person replaces the pending one.
  await db.delete(ts).where(and(eq(ts.authorId, authorId), eq(ts.key, input.key), eq(ts.locale, locale), eq(ts.status, "pending")))
  await db.insert(ts).values({ key: input.key, locale, text, note: (input.note ?? "").trim().slice(0, 500), authorId })
}

export async function pendingSuggestions(locale?: ExtraLocale) {
  return db.select({
    id: ts.id, key: ts.key, locale: ts.locale, text: ts.text, note: ts.note, createdAt: ts.createdAt, authorId: ts.authorId, author: user.name,
  }).from(ts).leftJoin(user, eq(user.id, ts.authorId))
    .where(locale ? and(eq(ts.status, "pending"), eq(ts.locale, locale)) : eq(ts.status, "pending"))
    .orderBy(desc(ts.createdAt))
}

export async function countPendingSuggestions() {
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(ts).where(eq(ts.status, "pending"))
  return Number(n)
}

/** Approves (optionally with the reviewer's edited text) or rejects a suggestion. */
export async function reviewSuggestion(id: number, approve: boolean, reviewerId: string, text?: string) {
  const [s] = await db.select().from(ts).where(eq(ts.id, id))
  if (!s || s.status !== "pending") throw new UserError("error.translation.notPending")
  if (approve) await setLocaleText(s.key, s.locale as ExtraLocale, text ?? s.text, reviewerId)
  await db.update(ts).set({ status: approve ? "approved" : "rejected", reviewerId, reviewedAt: sql`(datetime('now'))`, ...(approve && text ? { text } : {}) })
    .where(eq(ts.id, id))
}
