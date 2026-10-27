import { TYPE_LABELS, type SiteType } from "@/lib/content"
import { trData } from "@/lib/i18n"
import type { Locale } from "@/lib/locales"
import { cn } from "@/lib/utils"

export const typeDot: Record<SiteType, string> = {
  church: "bg-type-church", monastery: "bg-type-monastery", chapel: "bg-type-chapel", basilica: "bg-type-basilica",
}
export const typeBorder: Record<SiteType, string> = {
  church: "border-type-church", monastery: "border-type-monastery", chapel: "border-type-chapel", basilica: "border-type-basilica",
}
export const typeText: Record<SiteType, string> = {
  church: "text-type-church", monastery: "text-type-monastery", chapel: "text-type-chapel", basilica: "text-type-basilica",
}

export function TypeBadge({ type, lang, className }: { type: SiteType; lang: Locale; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase", typeText[type], className)}>
      <span className={cn("size-2 rounded-full", typeDot[type])} />
      {trData(`data.type.${type}`, TYPE_LABELS[type], lang) || type}
    </span>
  )
}
