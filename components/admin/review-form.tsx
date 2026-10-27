"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { reviewSubmissionAction } from "@/app/admin/actions"
import { useAdminT } from "@/components/i18n-provider"

export function ReviewForm({ id, kind, canVerifyLocation, points, locationPoints }: {
  id: number; kind: "create" | "update"; canVerifyLocation: boolean; points: number; locationPoints: number
}) {
  const t = useAdminT()
  const router = useRouter()
  const [note, setNote] = useState("")
  const [publish, setPublish] = useState(false)
  const [verify, setVerify] = useState(false)
  const [pending, start] = useTransition()

  const decide = (decision: "approve" | "reject") => start(async () => {
    const r = await reviewSubmissionAction(id, decision, note, publish, verify)
    if (!r.ok) return void toast.error(r.error)
    toast.success(t(decision === "approve" ? "editor.review.approved" : "editor.review.rejected"))
    router.push("/admin/submissions")
  })

  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="font-heading text-lg">{t("editor.review.title")}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="review-note">{t("editor.review.note")}</Label>
          <Textarea id="review-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={publish} onCheckedChange={(c) => setPublish(!!c)} />
          {t(kind === "create" ? "editor.review.publishNew" : "editor.review.publishDraft")}
        </label>
        {canVerifyLocation && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={verify} onCheckedChange={(c) => setVerify(!!c)} />
            {t("editor.review.verifyLocation")}
          </label>
        )}
        <p className="text-sm">{t("editor.review.earnBefore")} <b className="text-primary">{points + (verify ? locationPoints : 0)}</b> {t("editor.review.earnAfter")}</p>
        <p className="text-xs text-muted-foreground">{t("editor.review.afterApprove")}</p>
        <div className="flex gap-2">
          <Button onClick={() => decide("approve")} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Check />}{t("editor.review.approve")}</Button>
          <Button variant="destructive" onClick={() => decide("reject")} disabled={pending}><X />{t("editor.review.reject")}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
