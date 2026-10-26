import "server-only"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { normaliseContent, type SiteContent } from "@/lib/content"
import { addPhoto, createSite, getSite, slugTaken, updateSite, type PhotoInput, type SiteInput } from "@/lib/sites"
import { deleteStored } from "@/lib/storage"

const { submissions, user } = schema

/** What a user proposes: the full church data as they want it, plus photos to add. */
export type ProposalPayload = { site: SiteInput; photos: PhotoInput[] }

export async function createSubmission(input: {
  kind: "create" | "update"; siteId: number | null; payload: ProposalPayload; note: string; authorId: string
}) {
  const [row] = await db.insert(submissions).values({
    kind: input.kind, siteId: input.siteId, payload: JSON.stringify(input.payload), note: input.note, authorId: input.authorId,
  }).returning({ id: submissions.id })
  return row.id
}

const parsePayload = (s: string): ProposalPayload => {
  const p = JSON.parse(s)
  return { site: { ...p.site, content: normaliseContent(p.site?.content) as SiteContent }, photos: p.photos ?? [] }
}

export async function listSubmissions(filter: { status?: "pending" | "approved" | "rejected"; authorId?: string } = {}) {
  const rows = await db.select({ s: submissions, authorName: user.name, authorEmail: user.email })
    .from(submissions).leftJoin(user, eq(user.id, submissions.authorId))
    .where(and(
      filter.status ? eq(submissions.status, filter.status) : undefined,
      filter.authorId ? eq(submissions.authorId, filter.authorId) : undefined,
    ))
    .orderBy(desc(submissions.createdAt))
    .limit(200)
  return rows.map(({ s, authorName, authorEmail }) => ({ ...s, payload: parsePayload(s.payload), authorName, authorEmail }))
}

export async function getSubmission(id: number) {
  const [row] = await db.select({ s: submissions, authorName: user.name, authorEmail: user.email })
    .from(submissions).leftJoin(user, eq(user.id, submissions.authorId)).where(eq(submissions.id, id))
  if (!row) return null
  const reviewer = row.s.reviewerId
    ? (await db.select({ name: user.name }).from(user).where(eq(user.id, row.s.reviewerId)))[0]?.name ?? null
    : null
  return { ...row.s, payload: parsePayload(row.s.payload), authorName: row.authorName, authorEmail: row.authorEmail, reviewerName: reviewer }
}

export async function countPending() {
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(submissions).where(eq(submissions.status, "pending"))
  return Number(n)
}

/** Applies a pending proposal. Returns the id of the created/updated church. */
export async function approveSubmission(id: number, reviewerId: string, reviewNote: string, publish: boolean) {
  const sub = await getSubmission(id)
  if (!sub || sub.status !== "pending") throw new Error("Η πρόταση δεν είναι πλέον σε αναμονή.")
  const { site, photos } = sub.payload
  let siteId: number

  if (sub.kind === "create") {
    let slug = site.slug
    for (let i = 2; await slugTaken(slug); i++) slug = `${site.slug}-${i}`
    siteId = await createSite({ ...site, slug, published: publish })
  } else {
    const current = sub.siteId ? await getSite({ id: sub.siteId }) : null
    if (!current) throw new Error("Η εκκλησία της πρότασης δεν υπάρχει πλέον.")
    siteId = current.id
    // Users cannot change the address, publication or "verified location" flags.
    const { slug: _slug, published: _published, coordsVerified: _verified, ...changes } = site
    void _slug; void _published; void _verified
    await updateSite(siteId, { ...changes, ...(publish ? { published: true } : {}) })
  }
  for (const p of photos) await addPhoto(siteId, p)

  await db.update(submissions).set({
    status: "approved", reviewerId, reviewNote, reviewedAt: sql`(datetime('now'))`, siteId,
  }).where(eq(submissions.id, id))
  return siteId
}

export async function rejectSubmission(id: number, reviewerId: string, reviewNote: string) {
  const sub = await getSubmission(id)
  if (!sub || sub.status !== "pending") throw new Error("Η πρόταση δεν είναι πλέον σε αναμονή.")
  await db.update(submissions).set({ status: "rejected", reviewerId, reviewNote, reviewedAt: sql`(datetime('now'))` })
    .where(eq(submissions.id, id))
  await Promise.all(sub.payload.photos.map((p) => deleteStored(p.src))) // uploaded only for this proposal
}

export async function pendingAccounts() {
  return db.select().from(user).where(and(eq(user.approved, false), inArray(user.role, ["user"]))).orderBy(desc(user.createdAt))
}
