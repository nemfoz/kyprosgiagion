"use client"

import { Badge } from "@/components/ui/badge"
import { useAdminT } from "@/components/i18n-provider"

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const t = useAdminT()
  if (status === "approved") return <Badge className="bg-gold/20 text-foreground">{t("editor.status.approved")}</Badge>
  if (status === "rejected") return <Badge className="bg-crimson/10 text-crimson">{t("editor.status.rejected")}</Badge>
  return <Badge className="bg-secondary text-muted-foreground">{t("editor.status.pending")}</Badge>
}
