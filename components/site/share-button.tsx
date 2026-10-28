"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

/** The phone's share sheet where there is one; otherwise copies the link. */
export function ShareButton({ title, label, copied }: { title: string; label: string; copied: string }) {
  async function share() {
    const url = location.href.split("#")[0]
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch {} // closing the share sheet throws; nothing to do
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success(copied)
    } catch {}
  }
  return <Button type="button" variant="outline" className="h-10" onClick={share}><Share2 />{label}</Button>
}
