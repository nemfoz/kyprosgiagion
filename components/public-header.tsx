import Link from "next/link"
import { CalendarDays, Landmark, LayoutDashboard, LogIn, Map as MapIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NameDayBar } from "@/components/namedays/nameday-bar"
import { LangMenu } from "@/components/lang-menu"
import { MobileNav } from "@/components/mobile-nav"
import { getT } from "@/lib/i18n-server"
import { baseLang, localePath, type Locale } from "@/lib/locales"
import { nameDaysAround } from "@/lib/namedays"
import { siteName } from "@/lib/regions"

/**
 * Header of the public pages (except the map, which has its own): name-day bar, title, navigation.
 * `path` is the page's own address without the language prefix (with its parameters), for the language menu;
 * `children` adds page buttons. On phones the navigation moves into a menu (MobileNav).
 */
export async function PublicHeader({ lang, path, signedIn, children }: {
  lang: Locale; path: string; signedIn: boolean; children?: React.ReactNode
}) {
  const t = await getT()
  const nav = [
    { href: localePath("/", lang), label: t("map", lang), icon: <MapIcon /> },
    { href: localePath("/metropolis", lang), label: t("navMetropolises", lang), icon: <Landmark /> },
    { href: localePath("/eortologio", lang), label: t("navNameDays", lang), icon: <CalendarDays /> },
    { href: localePath("/contribute", lang), label: t("contribute", lang), icon: <Sparkles /> },
  ]
  return (
    <>
      <NameDayBar days={nameDaysAround(baseLang(lang))} lang={lang} />
      <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
        <Link href={localePath("/", lang)} className="flex min-w-0 items-center gap-2 font-heading text-lg font-bold">
          <span className="text-primary">☦</span><span className="truncate">{siteName(lang)}</span>
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-0.5">
          {nav.map((n) => (
            <Button key={n.href} variant="ghost" size="sm" className="max-md:hidden" asChild>
              <Link href={n.href} aria-label={n.label}>{n.icon}<span className="hidden lg:inline">{n.label}</span></Link>
            </Button>
          ))}
          {children}
          <LangMenu lang={lang} path={path} />
          <Button variant="ghost" size="sm" className="max-md:hidden" asChild>
            <Link href={signedIn ? "/admin" : localePath("/login", lang)} aria-label={signedIn ? t("dashboard", lang) : t("signIn", lang)}>
              {signedIn ? <LayoutDashboard /> : <LogIn />}<span className="hidden xl:inline">{signedIn ? t("dashboard", lang) : t("signIn", lang)}</span>
            </Link>
          </Button>
          <MobileNav lang={lang} signedIn={signedIn} />
        </nav>
      </header>
    </>
  )
}
