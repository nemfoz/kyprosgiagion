import "server-only"
import type { Lang } from "@/lib/content"
import { getAdminLang } from "@/lib/i18n-server"

/** Language of the sign-in pages: ?lang= in the address, otherwise the admin-language cookie, otherwise Greek. */
export async function authLang(param: unknown): Promise<Lang> {
  return param === "en" || param === "el" ? param : getAdminLang()
}
