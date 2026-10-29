import Link from "next/link"
import { CalendarDays, Footprints, Landmark, LayoutDashboard, LogIn, Map as MapIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NameDayBar } from "@/components/namedays/nameday-bar"
import { LangMenu } from "@/components/lang-menu"
import { MobileNav } from "@/components/mobile-nav"
import { getT } from "@/lib/i18n-server"
import { baseLang, localePath, type Locale } from "@/lib/locales"
import { nameDaysAround } from "@/lib/namedays"
import { brandName, editionPaths, editionTitle } from "@/lib/editions"
import { linkedEdition } from "@/lib/edition-page"

/**
 * Header of the public pages (except the map, which has its own): name-day bar, title, navigation.
 * `path` is the page's own address without the language prefix (with its parameters), for the language menu;
 * `children` adds page buttons; `edition` is the page's edition (its title is shown next to the brand and the map/sees
 * links go to it; default: the main edition), `false` for none. On phones the navigation moves into a menu (MobileNav).
 */
export async function PublicHeader({ lang, path, signedIn, edition, children }: {
  lang: Locale; path: string; signedIn: boolean; edition?: string | false; children?: React.ReactNode
}) {
  const [t, ed] = await Promise.all([getT(), linkedEdition(edition || undefined)])
  const paths = editionPaths(ed?.id ?? "cyprus")
  const shown = edition !== false && ed ? { id: ed.id, title: editionTitle(ed, lang) } : null
  const nav = [
    { href: localePath(paths.map, lang), label: t("map", lang), icon: <MapIcon /> },
    { href: localePath(paths.metropolises, lang), label: t("navMetropolises", lang), icon: <Landmark /> },
    { href: localePath("/eortologio", lang), label: t("navNameDays", lang), icon: <CalendarDays /> },
    { href: localePath("/contribute", lang), label: t("contribute", lang), icon: <Sparkles /> },
  ]
  return (
    <>
      <NameDayBar days={nameDaysAround(baseLang(lang))} lang={lang} />
      <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
        <span className="flex min-w-0 items-baseline gap-2">
          <Link href={localePath("/", lang)} className="flex shrink-0 items-center gap-2 font-heading text-lg font-bold">
            <span className="text-primary">☦</span>{brandName(lang)}
          </Link>
          {shown && (
            <Link href={localePath(paths.home, lang)} className="truncate text-sm text-muted-foreground hover:text-primary max-sm:hidden">· {shown.title}</Link>
          )}
        </span>
        <nav className="ml-auto flex shrink-0 items-center gap-0.5">
          {nav.map((n) => (
            <Button key={n.href} variant="ghost" size="sm" className="max-md:hidden" asChild>
              <Link href={n.href} aria-label={n.label}>{n.icon}<span className="hidden lg:inline">{n.label}</span></Link>
            </Button>
          ))}
          {children}
          <LangMenu lang={lang} path={path} />
          {signedIn && (
            <Button variant="ghost" size="sm" className="max-md:hidden" asChild>
              <Link href={localePath("/profile", lang)} aria-label={t("myOdoiporiko", lang)}><Footprints /><span className="hidden xl:inline">{t("myOdoiporiko", lang)}</span></Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="max-md:hidden" asChild>
            <Link href={signedIn ? "/admin" : localePath("/login", lang)} aria-label={signedIn ? t("dashboard", lang) : t("signIn", lang)}>
              {signedIn ? <LayoutDashboard /> : <LogIn />}<span className="hidden xl:inline">{signedIn ? t("dashboard", lang) : t("signIn", lang)}</span>
            </Link>
          </Button>
          <MobileNav lang={lang} signedIn={signedIn} edition={{ id: ed?.id ?? "cyprus", title: ed ? editionTitle(ed, lang) : "" }} />
        </nav>
      </header>
    </>
  )
}
