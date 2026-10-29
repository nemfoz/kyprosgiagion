import "server-only"
import path from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

// DATABASE_URL (the server: file:/data/app.db), else data/app.db for development.
const url = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "app.db")}`

const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })
export { schema }
