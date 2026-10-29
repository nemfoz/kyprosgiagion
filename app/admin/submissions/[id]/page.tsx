import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/admin/status-badge"
import { ReviewForm } from "@/components/admin/review-form"
import { LANGS, TEXT_FIELDS, TYPE_LABELS, type SiteType } from "@/lib/content"
import { isAdmin } from "@/lib/permissions"
import { listRegions } from "@/lib/regions-server"
import { requireUser } from "@/lib/session"
import { getSite } from "@/lib/sites"
import { getSubmission } from "@/lib/submissions"
import { BONUSES, completeness, mediaBonuses, translationBonuses, scoreProposal, type MissionKey } from "@/lib/completeness"
import { getPointsConfig } from "@/lib/points"
import { EXTRA_FIELDS, youtubeEmbed } from "@/lib/content"
import { EXTRA_LOCALES, LOCALE_NAMES } from "@/lib/locales"
import { getAdminT } from "@/lib/i18n-server"
import type { MessageKey } from "@/lib/i18n"
import { sized } from "@/lib/photo-sizes.mjs"

const FIELD_LABELS: Record<string, MessageKey> = {
  name: "editor.diff.name", location: "editor.diff.location", summary: "editor.diff.summary", body: "editor.diff.body", facts: "editor.diff.facts", sources: "editor.diff.sources",
}

export default async function SubmissionPage({ params }: PageProps<"/admin/submissions/[id]">) {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const sub = await getSubmission(Number((await params).id))
  if (!sub || (!admin && sub.authorId !== user.id)) notFound()
  const [current, cfg, t, regions] = await Promise.all([sub.siteId ? getSite({ id: sub.siteId }) : null, getPointsConfig(), getAdminT(), listRegions()])
  const regionName = (id: string) => regions.find((r) => r.id === id)?.name[t.lang] ?? id
  const p = sub.payload.site
  const showAll = sub.kind === "create" || !current
  // Points the author would earn (location verification is added by the reviewer's choice).
  const before = current ? completeness({ content: current.content, coordsVerified: current.coordsVerified, photoCount: current.photos.length }, cfg).done : new Set<MissionKey>()
  const after = completeness({ content: p.content, coordsVerified: current?.coordsVerified ?? false, photoCount: (current?.photos.length ?? 0) + sub.payload.photos.length }, cfg)
  const estimate = scoreProposal(cfg, before, after.done, [...mediaBonuses(current?.photos.length ?? 0, sub.payload.photos, sub.payload.videos), ...translationBonuses(current?.content ?? null, p.content)]).points
  const locationPoints = cfg.sections.location * 2
  const pinMoved = !current || current.lat !== p.lat || current.lng !== p.lng
  const canVerifyLocation = pinMoved && !current?.coordsVerified

  // Field-by-field comparison with the church as it is now.
  const rows: { label: string; before: string; after: string }[] = []
  const add = (label: string, before: string, after: string) => {
    if (showAll ? after : before !== after) rows.push({ label, before, after })
  }
  add(t("editor.type"), current ? TYPE_LABELS[current.type as SiteType]?.[t.lang] ?? current.type : "", TYPE_LABELS[p.type]?.[t.lang] ?? p.type)
  add(t("editor.region"), current ? regionName(current.region) : "", regionName(p.region))
  add(t("editor.diff.position"), current ? `${current.lat}, ${current.lng}` : "", `${p.lat}, ${p.lng}`)
  for (const lang of LANGS) {
    for (const f of TEXT_FIELDS) add(`${t(FIELD_LABELS[f])} (${lang.toUpperCase()})`, current?.content[lang][f] ?? "", p.content[lang][f])
  }
  for (const l of EXTRA_LOCALES) {
    for (const f of EXTRA_FIELDS) add(`${t(FIELD_LABELS[f])} (${LOCALE_NAMES[l]})`, current?.content[l]?.[f] ?? "", p.content[l]?.[f] ?? "")
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{p.content[t.lang].name || p.content.el.name || p.content.en.name}</h1>
        <StatusBadge status={sub.status} />
        {current && (
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link href={`/site/${encodeURIComponent(current.slug)}`} target="_blank">{t("editor.sub.currentPage")}<ExternalLink /></Link>
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {sub.status === "approved" && <b className="text-primary">{t("editor.sub.points", { n: sub.points })} · </b>}
        {t(sub.kind === "create" ? "editor.sub.byCreate" : "editor.sub.byUpdate")} <b>{sub.authorName}</b> ({sub.authorEmail}) · {sub.createdAt.slice(0, 16)}
      </p>

      {sub.note && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{t("editor.sub.userNote")}</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap">{sub.note}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">{t(showAll ? "editor.sub.details" : "editor.sub.changes")}</CardTitle>
          {!showAll && <CardDescription>{t("editor.sub.changesHelp")}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4">
          {rows.length === 0 && <p className="text-muted-foreground">{t("editor.sub.noChanges")}</p>}
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
          <CardHeader><CardTitle className="font-heading text-lg">{t("editor.sub.newPhotos")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {sub.payload.photos.map((ph, i) => (
              <figure key={i} className="text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sized(ph.src, "md")} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                <figcaption className="mt-1 text-muted-foreground">
                  {ph.historic && <span className="mb-0.5 block font-semibold text-gold-deep">{BONUSES.historic_photo.label[t.lang]} · +{cfg.bonuses.historic_photo}</span>}
                  {[ph.captionEl, ph.credit && `© ${ph.credit}`].filter(Boolean).join(" · ")}
                  {ph.sourceUrl && <a href={ph.sourceUrl} target="_blank" rel="noopener" className="block break-all text-primary underline">{ph.sourceUrl}</a>}
                </figcaption>
              </figure>
            ))}
          </CardContent>
        </Card>
      )}

      {sub.payload.videos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{t("editor.sub.newVideos")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {sub.payload.videos.map((v) => (
              <figure key={v.youtubeId} className="text-xs">
                <div className="video-embed !mb-1"><iframe src={youtubeEmbed(v.youtubeId)} title={v.titleEl || "YouTube"} loading="lazy" allowFullScreen /></div>
                <figcaption className="text-muted-foreground">{[v.titleEl, v.titleEn].filter(Boolean).join(" · ")}</figcaption>
              </figure>
            ))}
          </CardContent>
        </Card>
      )}

      {sub.status === "pending" && admin ? (
        <ReviewForm id={sub.id} kind={sub.kind} canVerifyLocation={canVerifyLocation} points={estimate} locationPoints={locationPoints} />
      ) : sub.status !== "pending" && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{t("editor.sub.decision")}</CardTitle></CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <p><StatusBadge status={sub.status} /> {sub.reviewerName && t("editor.sub.byReviewer", { name: sub.reviewerName })} · {sub.reviewedAt?.slice(0, 16)}</p>
            {sub.reviewNote && <p className="mt-2 whitespace-pre-wrap">{sub.reviewNote}</p>}
            {sub.status === "approved" && sub.siteId && <Link href={`/admin/sites/${sub.siteId}`} className="mt-2 text-primary underline">{t("editor.sub.openEntry")}</Link>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
