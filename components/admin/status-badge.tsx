import { Badge } from "@/components/ui/badge"

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <Badge className="bg-gold/20 text-foreground">Εγκρίθηκε</Badge>
  if (status === "rejected") return <Badge className="bg-crimson/10 text-crimson">Απορρίφθηκε</Badge>
  return <Badge className="bg-secondary text-muted-foreground">Σε αναμονή</Badge>
}
