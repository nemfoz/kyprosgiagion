// Drizzle table definitions. The tables themselves are created by scripts/migrate.mjs
// (scripts/schema.mjs) — keep both in sync.
import { sql } from "drizzle-orm"
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

const now = sql`(datetime('now'))`

export const sites = sqliteTable("sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("church"),
  region: text("region").notNull().default("famagusta"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  coordsVerified: integer("coords_verified", { mode: "boolean" }).notNull().default(false),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  content: text("content").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
})

export const photos = sqliteTable("photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  src: text("src").notNull(),
  captionEl: text("caption_el").notNull().default(""),
  captionEn: text("caption_en").notNull().default(""),
  credit: text("credit").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  sort: integer("sort").notNull().default(0),
})

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["create", "update"] }).notNull(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "set null" }),
  payload: text("payload").notNull(),
  note: text("note").notNull().default(""),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  authorId: text("author_id").notNull(),
  reviewerId: text("reviewer_id"),
  reviewNote: text("review_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(now),
  reviewedAt: text("reviewed_at"),
})

// ---- Better Auth ----

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  ...timestamps,
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  ...timestamps,
})

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
})

// Per-IP request counters for Better Auth's rate limiting (database storage works across serverless instances).
export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
})

export type Site = typeof sites.$inferSelect
export type Photo = typeof photos.$inferSelect
export type Submission = typeof submissions.$inferSelect
export type User = typeof user.$inferSelect
