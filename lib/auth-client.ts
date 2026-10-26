import { createAuthClient } from "better-auth/react"
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins"
import type { auth } from "@/lib/auth"
import { ac, roles } from "@/lib/permissions"

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles }), inferAdditionalFields<typeof auth>()],
})
