import "server-only"
import { getAdminLang } from "@/lib/i18n-server"
import { isLocale, type Locale } from "@/lib/locales"

/** Language of the sign-in pages: the /en/, /ru/… prefix (?lang=), otherwise the admin language. */
export async function authLang(param: unknown): Promise<Locale> {
  return isLocale(param) ? param : getAdminLang()
}
