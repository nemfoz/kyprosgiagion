import Link from "next/link"
import { redirect } from "next/navigation"
import { TranslationsEditor } from "@/components/admin/translations-editor"
import { LocaleTranslations, type LocaleRow, type Suggestion } from "@/components/admin/locale-translations"
import { getAdminT, getOverrides } from "@/lib/i18n-server"
import { EXTRA_LOCALES, LOCALE_NAMES, type ExtraLocale } from "@/lib/locales"
import { LOCALE_MESSAGES } from "@/lib/messages/locales"
import { isAdmin, isSuperadmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { translatableTexts } from "@/lib/translatable"
import { pendingSuggestions } from "@/lib/translations"
import { cn } from "@/lib/utils"

// Superadmins edit the Greek and English texts here; for the extra languages everyone signed in can suggest
// fixes, admins review them and superadmins can edit directly.
export default async function TranslationsPage({ searchParams }: PageProps<"/admin/translations">) {
  const param = (await searchParams).locale
  const me = await requireUser(typeof param === "string" ? `/admin/translations?locale=${encodeURIComponent(param)}` : "/admin/translations")
  const superadmin = isSuperadmin(me.role)
  const locale = EXTRA_LOCALES.find((l) => l === param) ?? null
  if (!locale && !superadmin) redirect(`/admin/translations?locale=${EXTRA_LOCALES[0]}`)
  const [t, overrides, pending] = await Promise.all([getAdminT(), getOverrides(), pendingSuggestions()])
  const count = (l: ExtraLocale) => pending.filter((s) => s.locale === l && (isAdmin(me.role) || s.authorId === me.id)).length

  const tabs = [
    ...(superadmin ? [{ href: "/admin/translations", label: t("admin.tr.greekEnglish"), active: !locale, n: 0 }] : []),
    ...EXTRA_LOCALES.map((l) => ({ href: `/admin/translations?locale=${l}`, label: LOCALE_NAMES[l], active: l === locale, n: isAdmin(me.role) ? count(l) : 0 })),
  ]
  const rows: LocaleRow[] = locale
    ? (await translatableTexts()).map((r) => ({ ...r, draft: LOCALE_MESSAGES[locale][r.key] ?? "", override: overrides[r.key]?.[locale] ?? "" }))
    : []
  const suggestions: Suggestion[] = locale
    ? pending.filter((s) => s.locale === locale && (isAdmin(me.role) || s.authorId === me.id))
      .map((s) => ({ id: s.id, key: s.key, text: s.text, note: s.note, author: s.author, mine: s.authorId === me.id }))
    : []

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("admin.nav.translations")}</h1>
      <nav className="flex flex-wrap gap-1" aria-label={t("admin.tr.languages")}>
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href}
            className={cn("rounded-full border px-3 py-1 text-sm hover:bg-muted", tab.active && "border-primary bg-accent font-semibold")}>
            {tab.label}{tab.n > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{tab.n}</span>}
          </Link>
        ))}
      </nav>
      {locale ? (
        <>
          <p className="max-w-3xl text-sm text-muted-foreground">{t("admin.tr.localeIntro", { language: LOCALE_NAMES[locale] })}</p>
          <LocaleTranslations locale={locale} rows={rows} suggestions={suggestions} role={superadmin ? "superadmin" : isAdmin(me.role) ? "admin" : "user"} />
        </>
      ) : (
        <>
          <p className="max-w-3xl text-sm text-muted-foreground">{t("admin.translations.intro")}</p>
          <TranslationsEditor initial={overrides} />
        </>
      )}
    </div>
  )
}
