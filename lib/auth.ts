import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { admin, captcha } from "better-auth/plugins"
import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { actionEmail, sendEmail } from "@/lib/email"
import { HONEYPOT_FIELD, isDisposableEmail, MIN_FORM_SECONDS } from "@/lib/antispam"
import { ac, roles } from "@/lib/permissions"

// Accounts with these e-mails become superadmins when they sign up (after confirming the address).
const superadminEmails = (process.env.SUPERADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)

const isSuperadminEmail = (email: unknown) => superadminEmails.includes(String(email ?? "").toLowerCase().trim())

/** Bootstrap: until a confirmed superadmin exists, a SUPERADMIN_EMAILS sign-up is confirmed without an e-mail. */
async function needsFirstSuperadmin() {
  const [row] = await db.select({ id: schema.user.id }).from(schema.user)
    .where(and(eq(schema.user.role, "superadmin"), eq(schema.user.emailVerified, true))).limit(1)
  return !row
}

const turnstileSecret = process.env.TURNSTILE_SECRET_KEY

export const auth = betterAuth({
  appName: "Οδοιπορικό",
  // A fixed URL in production (BETTER_AUTH_URL=https://odoiporiko.com on the server); otherwise the request
  // host, limited to ours.
  baseURL: process.env.BETTER_AUTH_URL || {
    allowedHosts: [
      "localhost:3000",
      "odoiporiko.com", "www.odoiporiko.com",
      // more host names: APP_HOSTS="a.example.com,b.example.com"
      ...(process.env.APP_HOSTS || "").split(",").map((h) => h.trim()).filter(Boolean),
    ],
  },
  secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user, session: schema.session, account: schema.account,
      verification: schema.verification, rateLimit: schema.rateLimit,
    },
  }),

  // New accounts can sign in (and propose changes) only after confirming their e-mail address.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Επαναφορά κωδικού – Οδοιπορικό",
        ...actionEmail({
          name: user.name, url,
          intro: ["Ζητήθηκε επαναφορά του κωδικού σας.", "A password reset was requested for your account."],
          button: ["Ορισμός νέου κωδικού", "Set a new password"],
          outro: ["Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το μήνυμα. Ο σύνδεσμος λήγει σε 1 ώρα.", "If you did not ask for this, ignore this e-mail. The link expires in 1 hour."],
        }),
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true, // signing in unverified re-sends the link
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Επιβεβαίωση e-mail – Οδοιπορικό",
        ...actionEmail({
          name: user.name, url,
          intro: ["Ευχαριστούμε για την εγγραφή σας. Επιβεβαιώστε τη διεύθυνση e-mail σας για να ενεργοποιηθεί ο λογαριασμός.", "Thank you for signing up. Please confirm your e-mail address to activate your account:"],
          button: ["Επιβεβαίωση e-mail", "Confirm e-mail"],
          outro: ["Ο σύνδεσμος ισχύει για 24 ώρες. Αν δεν κάνατε εσείς την εγγραφή, αγνοήστε αυτό το μήνυμα.", "The link is valid for 24 hours. If you did not sign up, ignore this e-mail."],
        }),
      })
    },
    // Confirming the address activates the account: no admin approval needed.
    afterEmailVerification: async (user) => {
      await db.update(schema.user).set({ approved: true, updatedAt: new Date() }).where(eq(schema.user.id, user.id))
    },
  },

  // The session is kept in a signed cookie for 5 minutes, so most requests skip the database lookup.
  // (A ban or role change therefore takes up to 5 minutes to reach a browser that is already signed in.)
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },

  user: {
    additionalFields: {
      approved: { type: "boolean", defaultValue: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isSuperadminEmail(user.email)) return { data: user }
          const first = await needsFirstSuperadmin()
          return { data: { ...user, role: "superadmin", ...(first ? { emailVerified: true, approved: true } : {}) } }
        },
      },
    },
  },

  // Anti-spam, before anything is written or e-mailed: honeypot, minimum fill-in time, throwaway domains.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return
      // The confirmation e-mail is sent in the background, so check up front that it can be sent at all.
      const firstSuperadmin = isSuperadminEmail(ctx.body?.email) && (await needsFirstSuperadmin())
      if (process.env.REQUIRE_EMAIL && !process.env.RESEND_API_KEY && !firstSuperadmin) {
        throw new APIError("SERVICE_UNAVAILABLE", { message: "Οι εγγραφές δεν είναι ακόμα διαθέσιμες. Δοκιμάστε αργότερα.", code: "EMAIL_NOT_CONFIGURED" })
      }
      const h = ctx.headers
      const formAge = Number(h?.get("x-form-age"))
      if (h?.get(`x-${HONEYPOT_FIELD}`) || !Number.isFinite(formAge) || formAge < MIN_FORM_SECONDS) {
        throw new APIError("BAD_REQUEST", { message: "Η εγγραφή δεν ολοκληρώθηκε. Δοκιμάστε ξανά.", code: "SPAM_SUSPECTED" })
      }
      if (isDisposableEmail(String(ctx.body?.email ?? ""))) {
        throw new APIError("BAD_REQUEST", { message: "Χρησιμοποιήστε μια μόνιμη διεύθυνση e-mail.", code: "DISPOSABLE_EMAIL" })
      }
    }),
  },

  // Per-IP limits, stored in the database so they hold across serverless instances.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.RATE_LIMIT === "1",
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/sign-in/email": { window: 60, max: 8 },
      "/send-verification-email": { window: 10 * 60, max: 3 },
      "/request-password-reset": { window: 10 * 60, max: 3 },
    },
  },

  plugins: [
    admin({ ac, roles, defaultRole: "user", adminRoles: ["superadmin"] }),
    // Cloudflare Turnstile on sign-up / sign-in / password reset, when keys are configured.
    ...(turnstileSecret ? [captcha({ provider: "cloudflare-turnstile", secretKey: turnstileSecret })] : []),
    nextCookies(), // must stay last
  ],
})

export type AuthSession = typeof auth.$Infer.Session
