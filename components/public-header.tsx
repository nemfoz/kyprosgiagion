import Link from "next/link"
import { CalendarDays, Landmark, LayoutDashboard, LogIn, Map as MapIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NameDayBar } from "@/components/namedays/nameday-bar"
import type { Lang } from "@/lib/content"
import { getT } from "@/lib/i18n-server"
import { nameDaysAround } from "@/lib/namedays"
import { siteTitle } from "@/lib/regions"

/**
 * Header of the public pages (except the map, which has its own): name-day bar, title, navigation.
 * `otherLangHref` keeps the page's own parameters when switching language; `children` adds page buttons.
 */
export async function PublicHeader({ lang, otherLangHref, signedIn, children }: {
  lang: Lang; otherLangHref: string; signedIn: boolean; children?: React.ReactNode
}) {
  const t = await getT()
  const q = lang === "en" ? "?lang=en" : ""
  const nav = [
    { href: `/${q}`, label: t("map", lang), icon: <MapIcon /> },
    { href: `/metropolis${q}`, label: t("navMetropolises", lang), icon: <Landmark /> },
    { href: `/eortologio${q}`, label: t("navNameDays", lang), icon: <CalendarDays /> },
    { href: `/contribute${q}`, label: t("contribute", lang), icon: <Sparkles /> },
  ]
  return (
    <>
      <NameDayBar days={nameDaysAround(lang)} lang={lang} />
      <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
        <Link href={`/${q}`} className="flex min-w-0 items-center gap-2 font-heading text-lg font-bold">
          <span className="text-primary">☦</span><span className="truncate">{siteTitle[lang]}</span>
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-0.5">
          {nav.map((n) => (
            <Button key={n.href} variant="ghost" size="sm" asChild>
              <Link href={n.href} aria-label={n.label}>{n.icon}<span className="hidden lg:inline">{n.label}</span></Link>
            </Button>
          ))}
          {children}
          <Button variant="ghost" size="sm" asChild><Link href={otherLangHref}>{lang === "el" ? "EN" : "ΕΛ"}</Link></Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={signedIn ? "/admin" : "/login"} aria-label={signedIn ? t("dashboard", lang) : t("signIn", lang)}>
              {signedIn ? <LayoutDashboard /> : <LogIn />}<span className="hidden xl:inline">{signedIn ? t("dashboard", lang) : t("signIn", lang)}</span>
            </Link>
          </Button>
        </nav>
      </header>
    </>
  )
}
