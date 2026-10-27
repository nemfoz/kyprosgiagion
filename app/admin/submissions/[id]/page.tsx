import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/admin/status-badge"
import { ReviewForm } from "@/components/admin/review-form"
import { LANGS, TEXT_FIELDS, TYPE_LABELS, type SiteType } from "@/lib/content"
import { isAdmin } from "@/lib/permissions"
import { regions } from "@/lib/regions"
import { requireUser } from "@/lib/session"
import { getSite } from "@/lib/sites"
import { getSubmission } from "@/lib/submissions"
import { completeness, MISSIONS, PROPOSAL_POINTS, type MissionKey } from "@/lib/completeness"

const FIELD_LABELS: Record<string, string> = {
  name: "Όνομα", location: "Τοποθεσία", summary: "Σύντομη περιγραφή", body: "Κείμενο", facts: "Στοιχεία", sources: "Πηγές",
}
const regionName = (id: string) => regions.find((r) => r.id === id)?.name.el ?? id

export default async function SubmissionPage({ params }: PageProps<"/admin/submissions/[id]">) {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const sub = await getSubmission(Number((await params).id))
  if (!sub || (!admin && sub.authorId !== user.id)) notFound()
  const current = sub.siteId ? await getSite({ id: sub.siteId }) : null
  const p = sub.payload.site
  const showAll = sub.kind === "create" || !current
  // Points the author would earn (location verification is added by the reviewer's choice).
  const before = current ? completeness({ content: current.content, coordsVerified: current.coordsVerified, photoCount: current.photos.length }).done : new Set<MissionKey>()
  const after = completeness({ content: p.content, coordsVerified: current?.coordsVerified ?? false, photoCount: (current?.photos.length ?? 0) + sub.payload.photos.length })
  const estimate = PROPOSAL_POINTS + MISSIONS.filter((m) => after.done.has(m.key) && !before.has(m.key)).reduce((n, m) => n + m.points, 0)
  const pinMoved = !current || current.lat !== p.lat || current.lng !== p.lng
  const canVerifyLocation = pinMoved && !current?.coordsVerified

  // Field-by-field comparison with the church as it is now.
  const rows: { label: string; before: string; after: string }[] = []
  const add = (label: string, before: string, after: string) => {
    if (showAll ? after : before !== after) rows.push({ label, before, after })
  }
  add("Τύπος", current ? TYPE_LABELS[current.type as SiteType]?.el ?? current.type : "", TYPE_LABELS[p.type]?.el ?? p.type)
  add("Περιοχή", current ? regionName(current.region) : "", regionName(p.region))
  add("Θέση (lat, lng)", current ? `${current.lat}, ${current.lng}` : "", `${p.lat}, ${p.lng}`)
  for (const lang of LANGS) {
    for (const f of TEXT_FIELDS) add(`${FIELD_LABELS[f]} (${lang.toUpperCase()})`, current?.content[lang][f] ?? "", p.content[lang][f])
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{p.content.el.name || p.content.en.name}</h1>
        <StatusBadge status={sub.status} />
        {current && (
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link href={`/site/${current.slug}`} target="_blank">Τρέχουσα σελίδα<ExternalLink /></Link>
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {sub.status === "approved" && <b className="text-primary">+{sub.points} πόντοι · </b>}
        {sub.kind === "create" ? "Πρόταση νέας εκκλησίας" : "Πρόταση διόρθωσης"} από <b>{sub.authorName}</b> ({sub.authorEmail}) · {sub.createdAt.slice(0, 16)}
      </p>

      {sub.note && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Σημείωμα χρήστη</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap">{sub.note}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">{showAll ? "Στοιχεία" : "Αλλαγές"}</CardTitle>
          {!showAll && <CardDescription>Μόνο τα πεδία που διαφέρουν από τη σημερινή σελίδα.</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4">
          {rows.length === 0 && <p className="text-muted-foreground">Καμία αλλαγή στα κείμενα ή στη θέση.</p>}
          {rows.map((r) => (
            <div key={r.label} className="grid gap-1.5">
              <p className="text-sm font-semibold">{r.label}</p>
              <div className={`grid gap-2 ${showAll ? "" : "md:grid-cols-2"}`}>
                {!showAll && <pre className="rounded-md border border-crimson/25 bg-crimson/5 p-2.5 font-sans text-sm whitespace-pre-wrap">{r.before || "—"}</pre>}
                <pre className={`rounded-md border p-2.5 font-sans text-sm whitespace-pre-wrap ${showAll ? "bg-background" : "border-gold/50 bg-gold/10"}`}>{r.after || "—"}</pre>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {sub.payload.photos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Νέες φωτογραφίες</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {sub.payload.photos.map((ph, i) => (
              <figure key={i} className="text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.src} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                <figcaption className="mt-1 text-muted-foreground">
                  {[ph.captionEl, ph.credit && `© ${ph.credit}`].filter(Boolean).join(" · ")}
                  {ph.sourceUrl && <a href={ph.sourceUrl} target="_blank" rel="noopener" className="block break-all text-primary underline">{ph.sourceUrl}</a>}
                </figcaption>
              </figure>
            ))}
          </CardContent>
        </Card>
      )}

      {sub.status === "pending" && admin ? (
        <ReviewForm id={sub.id} kind={sub.kind} canVerifyLocation={canVerifyLocation} points={estimate} />
      ) : sub.status !== "pending" && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Απόφαση</CardTitle></CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <p><StatusBadge status={sub.status} /> {sub.reviewerName && <>από {sub.reviewerName}</>} · {sub.reviewedAt?.slice(0, 16)}</p>
            {sub.reviewNote && <p className="mt-2 whitespace-pre-wrap">{sub.reviewNote}</p>}
            {sub.status === "approved" && sub.siteId && <Link href={`/admin/sites/${sub.siteId}`} className="mt-2 text-primary underline">Άνοιγμα καταχώρησης</Link>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
