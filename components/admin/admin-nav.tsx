"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import type { Role } from "@/lib/permissions"
import { cn } from "@/lib/utils"

export function AdminNav({ role, pending }: { role: Role; pending: number }) {
  const path = usePathname()
  const admin = role !== "user"
  const items = [
    { href: "/admin", label: "Επισκόπηση", exact: true },
    { href: "/admin/sites", label: "Μνημεία" },
    { href: "/admin/submissions", label: admin ? "Προτάσεις" : "Οι προτάσεις μου", count: admin ? pending : 0 },
    ...(admin ? [{ href: "/admin/users", label: "Χρήστες", count: 0 }] : []),
  ]
  return (
    <nav className="flex min-w-0 gap-1 overflow-x-auto">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href)
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-muted font-semibold text-foreground")}
          >
            {i.label}
            {!!i.count && <Badge className="h-5 min-w-5 px-1.5">{i.count}</Badge>}
          </Link>
        )
      })}
    </nav>
  )
}
