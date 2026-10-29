"use client"

import { usePathname, useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Chooses the edition an admin list shows (?edition=). */
export function EditionPicker({ value, editions }: { value: string; editions: { id: string; name: string }[] }) {
  const router = useRouter()
  const path = usePathname()
  return (
    <Select value={value} onValueChange={(id) => router.push(`${path}?edition=${id}`)}>
      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
      <SelectContent>{editions.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
    </Select>
  )
}
