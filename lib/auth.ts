import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins"
import { db, schema } from "@/lib/db"
import { ac, roles } from "@/lib/permissions"

// Accounts with these e-mails become superadmins (and are approved) when they sign up.
const superadminEmails = (process.env.SUPERADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)

export const auth = betterAuth({
  appName: "Κύπρος – Αγίων Γη",
  // A fixed URL in production if BETTER_AUTH_URL is set; otherwise the request host, limited to ours
  // (so Vercel preview deployments work too).
  baseURL: process.env.BETTER_AUTH_URL || {
    allowedHosts: ["localhost:3000", "kyprosgiagion.vercel.app", "kyprosgiagion-*.vercel.app"],
  },
  secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: {
    additionalFields: {
      approved: { type: "boolean", defaultValue: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!superadminEmails.includes(user.email.toLowerCase())) return { data: user }
          return { data: { ...user, role: "superadmin", approved: true } }
        },
      },
    },
  },
  plugins: [
    admin({ ac, roles, defaultRole: "user", adminRoles: ["superadmin"] }),
    nextCookies(), // must stay last
  ],
})

export type AuthSession = typeof auth.$Infer.Session
