"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AdminLangSwitch, AdminNav } from "@/components/admin/admin-nav"
import { useAdminT } from "@/components/i18n-provider"
import type { Role } from "@/lib/permissions"
import { brandName } from "@/lib/editions"

function Brand() {
  const t = useAdminT()
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-3">
      <span aria-hidden className="grid h-10 w-9 place-items-center rounded-t-[20px] rounded-b-md border bg-accent text-xl text-primary">☦</span>
      <span className="grid leading-tight">
        <span className="font-heading text-base font-bold">{brandName(t.lang)}</span>
        <span className="text-xs text-muted-foreground">{t("admin.title")}</span>
      </span>
    </Link>
  )
}

/** Left sidebar on wide screens; a top bar with a slide-out menu on phones. `account` is the user menu. */
export function AdminSidebar({ role, pending, translations, messages, account }: { role: Role; pending: number; translations: number; messages: number; account: React.ReactNode }) {
  const t = useAdminT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto border-r bg-card py-5 pr-3 pl-3 md:flex">
        <Brand />
        <div className="flex-1"><AdminNav role={role} pending={pending} translations={translations} messages={messages} /></div>
        <AdminLangSwitch />
        <div className="border-t px-1 pt-3">{account}</div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card px-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label={t("admin.nav.menu")}><Menu /></Button></SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-5 p-4">
            <SheetTitle className="sr-only">{t("admin.nav.menu")}</SheetTitle>
            <Brand />
            <div className="flex-1"><AdminNav role={role} pending={pending} translations={translations} messages={messages} onNavigate={() => setOpen(false)} /></div>
            <AdminLangSwitch />
          </SheetContent>
        </Sheet>
        <Brand />
        <div className="ml-auto">{account}</div>
      </header>
    </>
  )
}
