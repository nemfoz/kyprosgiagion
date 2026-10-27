"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import { CalendarDays, Church, ExternalLink, FileClock, Landmark, Languages, LayoutDashboard, Trophy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAdminT } from "@/components/i18n-provider"
import { setAdminLangAction } from "@/app/admin/i18n-actions"
import type { MessageKey } from "@/lib/i18n"
import type { Role } from "@/lib/permissions"
import { cn } from "@/lib/utils"

type Item = { href: string; label: MessageKey; icon: React.ReactNode; exact?: boolean; count?: number }

/** Vertical admin menu (sidebar on wide screens, sheet on phones). */
export function AdminNav({ role, pending, onNavigate }: { role: Role; pending: number; onNavigate?: () => void }) {
  const t = useAdminT()
  const path = usePathname()
  const admin = role !== "user"
  const items: Item[] = [
    { href: "/admin", label: "admin.nav.overview", icon: <LayoutDashboard />, exact: true },
    { href: "/admin/sites", label: "admin.nav.sites", icon: <Church /> },
    { href: "/admin/submissions", label: admin ? "admin.nav.submissions" : "admin.nav.mySubmissions", icon: <FileClock />, count: admin ? pending : 0 },
    ...(admin ? [
      { href: "/admin/metropolises", label: "admin.nav.metropolises", icon: <Landmark /> } as Item,
      { href: "/admin/users", label: "admin.nav.users", icon: <Users /> } as Item,
    ] : []),
    ...(role === "superadmin" ? [
      { href: "/admin/points", label: "admin.nav.points", icon: <Trophy /> } as Item,
      { href: "/admin/translations", label: "admin.nav.translations", icon: <Languages /> } as Item,
    ] : []),
  ]
  const link = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
  return (
    <nav className="grid gap-0.5">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href)
        return (
          <Link key={i.href} href={i.href} onClick={onNavigate} className={cn(link, active && "bg-accent font-semibold text-foreground [&_svg]:text-primary")}>
            {i.icon}<span className="flex-1">{t(i.label)}</span>
            {!!i.count && <Badge className="h-5 min-w-5 px-1.5">{i.count}</Badge>}
          </Link>
        )
      })}
      <div className="my-2 border-t" />
      <Link href={t.lang === "en" ? "/?lang=en" : "/"} target="_blank" className={link}><ExternalLink />{t("admin.nav.publicMap")}</Link>
      <Link href={`/eortologio${t.lang === "en" ? "?lang=en" : ""}`} target="_blank" className={link}><CalendarDays />{t("navNameDays" as MessageKey)}</Link>
    </nav>
  )
}

/** ΕΛ | EN switch for the admin area (remembered in a cookie). */
export function AdminLangSwitch() {
  const t = useAdminT()
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center justify-between gap-2 px-3 text-xs text-muted-foreground">
      <span>{t("admin.nav.language")}</span>
      <div className="flex rounded-md bg-muted p-0.5" role="group" aria-label={t("admin.nav.language")}>
        {(["el", "en"] as const).map((l) => (
          <button key={l} type="button" disabled={pending} aria-pressed={t.lang === l}
            onClick={() => start(async () => { await setAdminLangAction(l); router.refresh() })}
            className={cn("rounded px-2 py-0.5 font-semibold", t.lang === l ? "bg-card text-foreground shadow-sm" : "hover:text-foreground")}>
            {l === "el" ? "ΕΛ" : "EN"}
          </button>
        ))}
      </div>
    </div>
  )
}
