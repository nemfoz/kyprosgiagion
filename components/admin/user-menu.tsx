"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { useAdminT } from "@/components/i18n-provider"
import type { MessageKey } from "@/lib/i18n"

/** `roleLabel`: a text key such as ROLE_LABELS[role] (plain text is shown as is). */
export function UserMenu({ name, email, roleLabel }: { name: string; email: string; roleLabel: string }) {
  const router = useRouter()
  const t = useAdminT()
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("admin.account")}>
          <Avatar className="size-8"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback></Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid">
          <span>{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{email}</span>
          <span className="mt-1 text-xs font-medium text-primary">{t(roleLabel as MessageKey)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => { await authClient.signOut(); router.push("/"); router.refresh() }}>
          <LogOut />{t("admin.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
