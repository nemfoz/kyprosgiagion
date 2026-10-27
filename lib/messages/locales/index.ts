import type { ExtraLocale } from "@/lib/locales"
import ru from "./ru"
import uk from "./uk"
import ro from "./ro"
import bg from "./bg"
import sr from "./sr"
import ka from "./ka"

/** Interface text in the extra languages (key → text); missing keys fall back to English. */
export const LOCALE_MESSAGES: Record<ExtraLocale, Record<string, string>> = { ru, uk, ro, bg, sr, ka }
