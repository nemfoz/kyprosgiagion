import Link from "next/link"
import { ArrowRight, Church, FileClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAdmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { listSites } from "@/lib/sites"
import { countPending, listSubmissions } from "@/lib/submissions"

export default async function Overview() {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const [sites, pending, mine] = await Promise.all([
    listSites({ publishedOnly: false }),
    admin ? countPending() : 0,
    admin ? [] : listSubmissions({ authorId: user.id }),
  ])
  const published = sites.filter((s) => s.published).length

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Καλώς ήρθατε, {user.name.split(" ")[0]}</h1>
        <Button asChild className="ml-auto">
          <Link href="/admin/sites/new"><Plus />{admin ? "Νέα καταχώρηση" : "Πρόταση νέας εκκλησίας"}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={<Church />} title="Μνημεία" value={admin ? `${published} δημοσιευμένα` : `${published}`}
          detail={admin ? `${sites.length - published} πρόχειρα` : "στον χάρτη"} href="/admin/sites" />
        {admin ? (
          <>
            <Stat icon={<FileClock />} title="Προτάσεις σε αναμονή" value={String(pending)} detail="από χρήστες" href="/admin/submissions" highlight={pending > 0} />
          </>
        ) : (
          <Stat icon={<FileClock />} title="Οι προτάσεις μου" value={String(mine.length)}
            detail={`${mine.filter((s) => s.status === "pending").length} σε αναμονή`} href="/admin/submissions" />
        )}
      </div>

      {!admin && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Πώς λειτουργούν οι προτάσεις</CardTitle>
            <CardDescription>
              Μπορείτε να προτείνετε νέα εκκλησία ή να διορθώσετε μια υπάρχουσα (κείμενα, θέση, φωτογραφίες).
              Η πρόταση ελέγχεται από διαχειριστή πριν εμφανιστεί στον χάρτη και θα δείτε εδώ αν εγκρίθηκε.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

function Stat({ icon, title, value, detail, href, highlight }: {
  icon: React.ReactNode; title: string; value: string; detail: string; href: string; highlight?: boolean
}) {
  return (
    <Link href={href} className="group">
      <Card className={highlight ? "border-primary/40 ring-1 ring-primary/20" : ""}>
        <CardContent className="flex items-start gap-4">
          <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary [&_svg]:size-5">{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="font-heading text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  )
}
