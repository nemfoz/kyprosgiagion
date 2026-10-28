import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { OdoiporikoView } from "@/components/profile/odoiporiko-view"
import { PublicToggle } from "@/components/profile/public-toggle"
import { contributorStats } from "@/lib/contributors"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { localePath } from "@/lib/locales"
import { getSession } from "@/lib/session"
import { isPublicProfile, odoiporiko } from "@/lib/visits"
import { pageTitle } from "@/lib/seo"

export async function generateMetadata({ searchParams }: PageProps<"/profile">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const t = await getT()
  return { title: pageTitle(t("myOdoiporiko", lang), lang), robots: { index: false } }
}

/** The signed-in user's odoiporiko: the churches they have visited, with the counts, and the public-profile switch. */
export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const lang = langFrom((await searchParams).lang)
  const session = await getSession()
  if (!session) redirect(localePath(`/login?next=${encodeURIComponent(localePath("/profile", lang))}`, lang))
  const [t, data, stats, isPublic] = await Promise.all([getT(), odoiporiko(session.user.id), contributorStats(session.user.id), isPublicProfile(session.user.id)])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path="/profile" signedIn />
      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="mb-3 text-[11px] font-semibold tracking-[.14em] text-gold uppercase">{t("myOdoiporiko", lang)}</p>
          <h1 className="text-[clamp(28px,4.5vw,42px)] leading-tight font-bold">{session.user.name}</h1>
          <p className="mt-2 text-parchment/85">{t("pfIntro", lang)}</p>
        </div>
      </section>
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <OdoiporikoView data={data} lang={lang} t={t} own level={stats.points > 0 ? stats.level : null} badges={stats.badges} />
        <aside className="grid content-start gap-3 lg:sticky lg:top-4 lg:self-start">
          <PublicToggle initial={isPublic} lang={lang} href={localePath(`/u/${session.user.id}`, lang)} />
        </aside>
      </main>
      <SiteFooter lang={lang} />
    </div>
  )
}
