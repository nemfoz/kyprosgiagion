"use client"

import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { localePath, type Locale } from "@/lib/locales"
import { useT } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"

export type NameDays = { yesterday: string[]; today: string[]; tomorrow: string[]; feast: string | null }

/** Slim bar above the header: who celebrated yesterday, today and tomorrow. Links to the full calendar. */
export function NameDayBar({ days, lang, className }: { days: NameDays; lang: Locale; className?: string }) {
  const t = useT()
  const list = (names: string[]) => (names.length ? names.join(", ") : "—")
  return (
    <Link
      href={localePath("/eortologio", lang)}
      className={cn("flex h-8 shrink-0 items-center gap-3 overflow-hidden bg-crimson px-4 text-xs whitespace-nowrap text-parchment/80 hover:text-parchment md:px-7", className)}
      title={t("navNameDays", lang)}
    >
      <CalendarDays className="size-3.5 shrink-0 text-gold" />
      <span className="shrink-0 font-semibold tracking-wider text-gold uppercase">{t("ndBarTitle", lang)}</span>
      <span className="hidden min-w-0 truncate lg:inline">{t("ndYesterday", lang)}: {list(days.yesterday)}</span>
      <span className="min-w-0 truncate font-semibold text-parchment">
        {t("ndToday", lang)}: {days.feast && <span className="text-gold">{days.feast} · </span>}{list(days.today)}
      </span>
      <span className="hidden min-w-0 truncate md:inline">{t("ndTomorrow", lang)}: {list(days.tomorrow)}</span>
    </Link>
  )
}
