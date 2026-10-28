import crypto from "node:crypto"
import { list } from "@vercel/blob"
import { db } from "@/lib/db"

// One-off export for moving to the self-hosted server (scripts/import-dump.mjs): every table except sessions,
// verification tokens and rate limits, plus the list of stored photos. Off unless EXPORT_TOKEN is set;
// remove the variable once the move is done.
const SKIP = new Set(["session", "verification", "rate_limit", "sqlite_sequence"])

export async function GET(req: Request) {
  const token = process.env.EXPORT_TOKEN
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!token || given.length !== token.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return new Response("Not found", { status: 404 })
  }
  const client = db.$client
  const names = (await client.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((r) => String(r.name)).filter((n) => !SKIP.has(n))
  const tables: Record<string, Record<string, unknown>[]> = {}
  for (const name of names) {
    const r = await client.execute(`SELECT * FROM "${name}"`)
    tables[name] = r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])))
  }
  const blobs: string[] = []
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    let cursor: string | undefined
    do {
      const page = await list({ cursor, limit: 1000 })
      blobs.push(...page.blobs.map((b) => b.pathname))
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
  }
  return Response.json({ exportedAt: new Date().toISOString(), tables, blobs }, { headers: { "Cache-Control": "no-store" } })
}
