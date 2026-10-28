import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { OdoiporikoView } from "@/components/profile/odoiporiko-view"
import { contributorStats } from "@/lib/contributors"
import { publicName } from "@/lib/completeness"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { getSession } from "@/lib/session"
import { odoiporiko, publicProfileUser } from "@/lib/visits"
import { pageTitle } from "@/lib/seo"

export async function generateMetadata({ params, searchParams }: PageProps<"/u/[id]">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const [t, u] = await Promise.all([getT(), publicProfileUser((await params).id)])
  if (!u) return { robots: { index: false } }
  return { title: pageTitle(t("pfTheirOdoiporiko", lang, { name: publicName(u.name) }), lang), robots: { index: false } }
}

/** A public odoiporiko (only when its owner turned it on): name, counts and badges — no dates, no list of visits. */
export default async function PublicProfilePage({ params, searchParams }: PageProps<"/u/[id]">) {
  const { id } = await params
  const lang = langFrom((await searchParams).lang)
  const [t, u, session] = await Promise.all([getT(), publicProfileUser(id), getSession()])
  if (!u) notFound()
  const [data, stats] = await Promise.all([odoiporiko(u.id), contributorStats(u.id)])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path={`/u/${u.id}`} signedIn={!!session} />
      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-[clamp(28px,4.5vw,42px)] leading-tight font-bold">{t("pfTheirOdoiporiko", lang, { name: publicName(u.name) })}</h1>
        </div>
      </section>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <OdoiporikoView data={data} lang={lang} t={t} own={false} level={stats.points > 0 ? stats.level : null} badges={stats.badges} />
      </main>
      <SiteFooter lang={lang} />
    </div>
  )
}
