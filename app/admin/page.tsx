import Link from "next/link"
import { ArrowRight, Church, FileClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAdmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"
import { listSites } from "@/lib/sites"
import { countPending, listSubmissions } from "@/lib/submissions"
import { contributorStats, missionBoard } from "@/lib/contributors"
import { MyProgress } from "@/components/gamify/my-progress"
import { getAdminT } from "@/lib/i18n-server"

export default async function Overview() {
  const user = await requireUser()
  const admin = isAdmin(user.role)
  const [sites, pending, mine, stats, board, t] = await Promise.all([
    listSites({ publishedOnly: false }),
    admin ? countPending() : 0,
    admin ? [] : listSubmissions({ authorId: user.id }),
    contributorStats(user.id),
    missionBoard(),
    getAdminT(),
  ])
  const published = sites.filter((s) => s.published).length

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("admin.overview.welcome", { name: user.name.split(" ")[0] })}</h1>
        <Button asChild className="ml-auto">
          <Link href="/admin/sites/new"><Plus />{admin ? t("admin.overview.newSite") : t("admin.overview.proposeSite")}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={<Church />} title={t("admin.overview.sites")} value={admin ? t("admin.overview.published", { n: published }) : `${published}`}
          detail={admin ? t("admin.overview.drafts", { n: sites.length - published }) : t("admin.overview.onMap")} href="/admin/sites" />
        {admin ? (
          <>
            <Stat icon={<FileClock />} title={t("admin.overview.pending")} value={String(pending)} detail={t("admin.overview.fromUsers")} href="/admin/submissions" highlight={pending > 0} />
          </>
        ) : (
          <Stat icon={<FileClock />} title={t("admin.overview.mine")} value={String(mine.length)}
            detail={t("admin.overview.minePending", { n: mine.filter((s) => s.status === "pending").length })} href="/admin/submissions" />
        )}
      </div>

      <MyProgress stats={stats} suggestions={board.sites.filter((s) => s.percent < 100).slice(0, 5)} overall={board.overall} />

      {!admin && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">{t("admin.overview.howTitle")}</CardTitle>
            <CardDescription>{t("admin.overview.howText")}</CardDescription>
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
