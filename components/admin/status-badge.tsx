import { Badge } from "@/components/ui/badge"

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-800">Εγκρίθηκε</Badge>
  if (status === "rejected") return <Badge className="bg-red-100 text-red-800">Απορρίφθηκε</Badge>
  return <Badge className="bg-amber-100 text-amber-900">Σε αναμονή</Badge>
}
