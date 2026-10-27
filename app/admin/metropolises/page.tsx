import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus, Rss } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAdminT } from "@/lib/i18n-server"
import { listMetropolises } from "@/lib/metropolises"
import { isAdmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"

export default async function MetropolisesAdminPage() {
  const user = await requireUser()
  if (!isAdmin(user.role)) notFound()
  const [t, list] = await Promise.all([getAdminT(), listMetropolises()])
  const when = new Intl.DateTimeFormat(t.lang === "el" ? "el-GR" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Nicosia" })
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("admin.nav.metropolises")}</h1>
        <Button asChild className="ml-auto"><Link href="/admin/metropolises/new"><Plus />{t("metro.new")}</Link></Button>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("metro.list.intro")}</p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr><th className="p-3 font-medium">{t("metro.col.name")}</th><th className="p-3 font-medium">{t("metro.col.churches")}</th><th className="p-3 font-medium">{t("metro.col.feed")}</th><th className="p-3 font-medium">{t("metro.col.news")}</th></tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="p-3">
                  <Link href={`/admin/metropolises/${m.id}`} className="flex items-center gap-3 font-medium hover:text-primary">
                    {m.logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.logo} alt="" className="size-8 rounded border bg-background object-contain" />
                      : <span className="grid size-8 place-items-center rounded bg-accent text-primary">☦</span>}
                    {m.content[t.lang].name || m.content.el.name}
                  </Link>
                </td>
                <td className="p-3">{m.churches}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {m.feedUrl
                    ? <span className="flex items-center gap-1"><Rss className="size-3.5 text-gold-deep" />{t("metro.fetched", { when: m.newsFetchedAt ? when.format(new Date(`${m.newsFetchedAt}Z`)) : t("metro.never") })}</span>
                    : t("metro.noFeed")}
                </td>
                <td className="max-w-80 truncate p-3 text-xs text-muted-foreground">{m.latest?.title ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
