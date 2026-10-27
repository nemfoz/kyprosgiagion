// Roles and permissions, shared by the server (lib/auth.ts) and the browser (lib/auth-client.ts).
//
//   user        – can propose new churches and changes; proposals wait for an admin.
//                 The account itself must be approved by an admin before proposing.
//   admin       – edits and publishes directly, reviews proposals, approves new accounts.
//   superadmin  – everything an admin can do, plus user management (roles, bans, new admins).
import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

export const statement = {
  ...defaultStatements,
  site: ["create", "update", "delete", "publish"],
  submission: ["create", "review"],
  account: ["approve"],
} as const

export const ac = createAccessControl(statement)

export const roles = {
  user: ac.newRole({ submission: ["create"] }),
  admin: ac.newRole({
    site: ["create", "update", "delete", "publish"],
    submission: ["create", "review"],
    account: ["approve"],
  }),
  superadmin: ac.newRole({
    ...adminAc.statements,
    site: ["create", "update", "delete", "publish"],
    submission: ["create", "review"],
    account: ["approve"],
  }),
}

export type Role = keyof typeof roles
export const ROLES: Role[] = ["user", "admin", "superadmin"]

/** Text keys of the role names (lib/messages/admin.ts): t(ROLE_LABELS[role]). */
export const ROLE_LABELS = {
  user: "role.user",
  admin: "role.admin",
  superadmin: "role.superadmin",
} as const satisfies Record<Role, string>

export const isRole = (r: unknown): r is Role => typeof r === "string" && r in roles
export const isAdmin = (r: unknown) => r === "admin" || r === "superadmin"
export const isSuperadmin = (r: unknown) => r === "superadmin"
