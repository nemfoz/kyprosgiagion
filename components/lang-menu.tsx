"use client"

import Link from "next/link"
import { Check, Languages, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useT } from "@/components/i18n-provider"
import { isExtra, LOCALE_NAMES, LOCALE_SHORT, LOCALES, localePath, type Locale } from "@/lib/locales"
import { cn } from "@/lib/utils"

/**
 * The language menu. With `path` (the page without its language prefix, e.g. "/site/x") each language is a
 * link; with `onChange` (the map) the language switches in place.
 */
export function LangMenu({ lang, path, onChange, className }: {
  lang: Locale; path?: string; onChange?: (l: Locale) => void; className?: string
}) {
  const t = useT()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label={t("language", lang)}>
          <Languages />{LOCALE_SHORT[lang]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {LOCALES.map((l) => {
          const label = (
            <>
              <span lang={l} className="flex-1">{LOCALE_NAMES[l]}</span>
              <Check className={cn("size-4", l !== lang && "invisible")} />
            </>
          )
          return onChange
            ? <DropdownMenuItem key={l} className="max-md:py-2.5" onSelect={() => onChange(l)}>{label}</DropdownMenuItem>
            : <DropdownMenuItem key={l} className="max-md:py-2.5" asChild><Link href={localePath(path ?? "/", l)} hrefLang={l}>{label}</Link></DropdownMenuItem>
        })}
        {isExtra(lang) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/admin/translations?locale=${lang}`} className="text-xs text-muted-foreground">
                <PenLine />{t("suggestTranslation", lang)}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
