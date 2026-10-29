"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { setEditionActiveAction, setRegionActiveAction } from "@/app/admin/geo-actions"

/** The "public" switch of an edition or a region in the admin lists. */
export function ActiveSwitch({ kind, id, active, label }: { kind: "edition" | "region"; id: string; active: boolean; label: string }) {
  const router = useRouter()
  const [on, setOn] = useState(active)
  const [pending, start] = useTransition()
  return (
    <Switch
      checked={on} disabled={pending} aria-label={label}
      onCheckedChange={(v) => start(async () => {
        const r = await (kind === "edition" ? setEditionActiveAction : setRegionActiveAction)(id, v)
        if (!r.ok) return void toast.error(r.error)
        setOn(v)
        router.refresh()
      })}
    />
  )
}
