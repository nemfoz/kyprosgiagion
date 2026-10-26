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

export function ReviewForm({ id, kind }: { id: number; kind: "create" | "update" }) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [publish, setPublish] = useState(false)
  const [pending, start] = useTransition()

  const decide = (decision: "approve" | "reject") => start(async () => {
    const r = await reviewSubmissionAction(id, decision, note, publish)
    if (!r.ok) return void toast.error(r.error)
    toast.success(decision === "approve" ? "Η πρόταση εγκρίθηκε" : "Η πρόταση απορρίφθηκε")
    router.push("/admin/submissions")
  })

  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="font-heading text-lg">Έλεγχος</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="review-note">Σημείωμα προς τον χρήστη (προαιρετικό)</Label>
          <Textarea id="review-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={publish} onCheckedChange={(c) => setPublish(!!c)} />
          {kind === "create" ? "Δημοσίευση αμέσως μετά την έγκριση" : "Δημοσίευση της σελίδας, αν είναι ακόμα πρόχειρη"}
        </label>
        <p className="text-xs text-muted-foreground">Μετά την έγκριση μπορείτε να επεξεργαστείτε την καταχώρηση κανονικά.</p>
        <div className="flex gap-2">
          <Button onClick={() => decide("approve")} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Check />}Έγκριση</Button>
          <Button variant="destructive" onClick={() => decide("reject")} disabled={pending}><X />Απόρριψη</Button>
        </div>
      </CardContent>
    </Card>
  )
}
