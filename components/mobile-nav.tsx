"use client"

import Link from "next/link"
import { CalendarDays, Landmark, LayoutDashboard, LogIn, Map as MapIcon, Menu, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useT } from "@/components/i18n-provider"
import { localePath, type Locale } from "@/lib/locales"
import { siteName } from "@/lib/regions"

/** Phones: the header's navigation as a menu that slides in from the right, with labels. */
export function MobileNav({ lang, signedIn }: { lang: Locale; signedIn: boolean }) {
  const t = useT()
  const links = [
    { href: localePath("/", lang), label: t("map", lang), icon: <MapIcon /> },
    { href: localePath("/metropolis", lang), label: t("navMetropolises", lang), icon: <Landmark /> },
    { href: localePath("/eortologio", lang), label: t("navNameDays", lang), icon: <CalendarDays /> },
    { href: localePath("/contribute", lang), label: t("contribute", lang), icon: <Sparkles /> },
    signedIn
      ? { href: "/admin", label: t("dashboard", lang), icon: <LayoutDashboard /> }
      : { href: localePath("/login", lang), label: t("signIn", lang), icon: <LogIn /> },
  ]
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu", lang)}><Menu className="size-5" /></Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 gap-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 font-heading text-lg"><span className="text-primary">☦</span>{siteName(lang)}</SheetTitle>
        </SheetHeader>
        <nav className="grid p-2">
          {links.map((l) => (
            <SheetClose key={l.href} asChild>
              <Link href={l.href} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-base hover:bg-muted [&_svg]:size-5 [&_svg]:text-primary">
                {l.icon}{l.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
