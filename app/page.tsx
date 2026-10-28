import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Church, Landmark, MapPinned } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { brandName, editionChurch, editionName, EDITIONS, paths } from "@/lib/editions"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { localePath } from "@/lib/locales"
import { publicMetropolises } from "@/lib/metropolises"
import { sized } from "@/lib/photo-sizes.mjs"
import { regions, siteName } from "@/lib/regions"
import { getSession } from "@/lib/session"
import { siteSummaries } from "@/lib/sites"
import { alternates, openGraph } from "@/lib/seo"

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const t = await getT()
  const title = `${brandName(lang)} – ${t("tagline", lang)}`
  return {
    title: { absolute: title }, description: t("seoBrand", lang),
    alternates: alternates("/", lang), openGraph: openGraph("/", lang, title, t("seoBrand", lang)), twitter: { card: "summary_large_image" },
  }
}

/** Οδοιπορικό's home page: what it is, and a choice of Church (edition). Only Cyprus is open so far. */
export default async function Home({ searchParams }: PageProps<"/">) {
  const lang = langFrom((await searchParams).lang)
  const [t, session, sites, metros] = await Promise.all([getT(), getSession(), siteSummaries(), publicMetropolises()])
  const covers = sites.filter((s) => s.cover && s.coordsVerified).slice(0, 3)
  const stats = [
    { n: sites.length, label: t("statChurches", lang), icon: <Church /> },
    { n: metros.length, label: t("statSees", lang), icon: <Landmark /> },
    { n: regions.filter((r) => r.active).length, label: t("statRegions", lang), icon: <MapPinned /> },
  ]
  const others = EDITIONS.filter((e) => !e.active)
  const cyprus = EDITIONS.find((e) => e.id === "cyprus")!

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path="/" signedIn={!!session} edition={false} />

      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <span aria-hidden className="mb-5 grid h-16 w-13 place-items-center rounded-t-[32px] rounded-b-lg border border-gold/50 bg-parchment/10 text-3xl text-gold">☦</span>
          <h1 className="font-heading text-[clamp(38px,7vw,64px)] leading-none font-bold">{brandName(lang)}</h1>
          <p className="mt-3 font-heading text-[clamp(18px,2.6vw,24px)] text-gold italic">{t("tagline", lang)}</p>
          <p className="mt-5 max-w-2xl leading-relaxed text-parchment/85">{t("homeIntro", lang)}</p>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10">
        <div>
          <h2 className="text-2xl font-bold">{t("homeChoose", lang)}</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("homeChooseText", lang)}</p>
        </div>

        {/* The open edition. */}
        <Link href={localePath(paths.home, lang)} className="group grid overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="grid content-start gap-4 p-6 md:p-8">
            <p className="text-[11px] font-semibold tracking-[.14em] text-gold-deep uppercase">{editionChurch(cyprus, lang)}</p>
            <h3 className="font-heading text-3xl leading-tight font-bold md:text-4xl">{siteName(lang)}</h3>
            <dl className="grid grid-cols-3 gap-3 border-y py-4">
              {stats.map((s) => (
                <div key={s.label} className="grid gap-0.5">
                  <dt className="order-2 text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="flex items-center gap-1.5 font-heading text-2xl font-bold [&_svg]:size-4 [&_svg]:text-gold-deep">{s.icon}{s.n}</dd>
                </div>
              ))}
            </dl>
            <span className="inline-flex items-center gap-2 font-semibold text-primary">{t("homeEnter", lang)}<ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
          </div>
          <div className="grid min-h-56 grid-cols-3 gap-1 bg-muted">
            {covers.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.id} src={sized(s.cover!, "md")} alt="" className={`size-full object-cover ${i === 0 ? "col-span-2 row-span-2" : ""}`} />
            ))}
          </div>
        </Link>

        {/* The other Churches, to come. */}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((e) => (
            <li key={e.id} className="grid content-start gap-1 rounded-xl border border-dashed bg-card/60 p-4">
              <span className="flex items-center justify-between gap-2">
                <span className="font-heading text-lg font-bold text-foreground/80">{editionName(e, lang)}</span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">{t("homeSoon", lang)}</span>
              </span>
              <span className="text-xs text-muted-foreground">{editionChurch(e, lang)}</span>
            </li>
          ))}
        </ul>

        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-accent/60 p-4 text-sm">
          <span className="min-w-0 flex-1">{t("homeHelp", lang)}</span>
          <Button asChild variant="outline" size="sm"><Link href={localePath("/contact", lang)}>{t("pageContact", lang)}</Link></Button>
        </p>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
