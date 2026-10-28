import { notFound } from "next/navigation"
import { MetropolisForm } from "@/components/admin/metropolis-form"
import { getAdminT } from "@/lib/i18n-server"
import { getMetropolis, metropolisPage, normaliseMetroContent } from "@/lib/metropolises"
import { isAdmin } from "@/lib/permissions"
import { requireUser } from "@/lib/session"

export default async function MetropolisEditPage({ params }: PageProps<"/admin/metropolises/[id]">) {
  const user = await requireUser()
  if (!isAdmin(user.role)) notFound()
  const { id } = await params
  const t = await getAdminT()
  if (id === "new") {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("metro.new")}</h1>
        <MetropolisForm id={null} initial={{ slug: "", sort: 100, website: "", feedUrl: "", logo: "", content: normaliseMetroContent({}) }} churches={[]} news={[]} />
      </div>
    )
  }
  const m = await getMetropolis({ id: Number(id) })
  if (!m) notFound()
  const page = (await metropolisPage(m.slug))!
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{m.content[t.lang].name || m.content.el.name}</h1>
      <MetropolisForm id={m.id} initial={{ slug: m.slug, sort: m.sort, website: m.website, feedUrl: m.feedUrl, logo: m.logo, content: m.content }}
        churches={page.churches.map((s) => ({ id: s.id, name: s.name[t.lang] || s.name.el || "" }))}
        news={page.news.map((n) => ({ id: n.id, title: n.title, url: n.url, date: n.publishedAt }))} />
    </div>
  )
}
