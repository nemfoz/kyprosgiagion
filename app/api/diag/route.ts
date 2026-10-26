// TEMP DIAGNOSTIC — remove after checking which database the runtime uses.
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const raw = process.env.TURSO_DATABASE_URL || ""
  let host = "-"
  try { host = new URL(raw.replace(/^libsql:/, "https:")).host } catch {}
  const tables = await db.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  const sites = await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM sites`).catch(() => [{ n: -1 }])
  const users = await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM user`).catch(() => [{ n: -1 }])
  return Response.json({ protocol: raw.split(":")[0], host, tables: tables.map((t) => t.name), sites: sites[0]?.n, users: users[0]?.n, blobStore: !!process.env.BLOB_STORE_ID })
}
