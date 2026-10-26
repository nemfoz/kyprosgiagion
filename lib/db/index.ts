import "server-only"
import path from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

// Production: Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN). Development: data/app.db.
const remote = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
if (!remote && process.env.VERCEL) throw new Error("TURSO_DATABASE_URL is not set for this Vercel environment.")
const url = remote || `file:${path.join(process.cwd(), "data", "app.db")}`

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })
export { schema }
