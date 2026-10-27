import type { Metadata } from "next"
import Link from "next/link"
import { after } from "next/server"
import { ArrowRight, Church, Newspaper } from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { listMetropolises, refreshStaleNews } from "@/lib/metropolises"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Μητροπόλεις", description: "Οι Μητροπόλεις της Εκκλησίας της Κύπρου, τα νέα τους και οι εκκλησίες τους στον χάρτη." }

export default async function MetropolisesPage({ searchParams }: PageProps<"/metropolis">) {
  const lang = langFrom((await searchParams).lang)
  const [t, session, list] = await Promise.all([getT(), getSession(), listMetropolises()])
  after(refreshStaleNews) // news are fetched in the background, at most hourly
  const q = lang === "en" ? "?lang=en" : ""

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader lang={lang} otherLangHref={lang === "en" ? "?" : "?lang=en"} signedIn={!!session} />
      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="mb-3 text-[11px] font-semibold tracking-[.14em] text-gold uppercase">{t("navMetropolises", lang)}</p>
          <h1 className="text-[clamp(26px,4vw,40px)] leading-tight font-bold">{t("metroTitle", lang)}</h1>
          <p className="mt-3 max-w-2xl text-parchment/85">{t("metroIntro", lang)}</p>
        </div>
      </section>
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => {
          const c = m.content[lang].name ? m.content[lang] : m.content.el
          return (
            <Link key={m.id} href={`/metropolis/${m.slug}${q}`} className="group grid content-start gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">
              <div className="flex items-center gap-3">
                {m.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.logo} alt="" className="size-14 shrink-0 rounded-lg border bg-background object-contain p-1" />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-t-[28px] rounded-b-lg bg-accent text-2xl text-primary">☦</span>
                )}
                <span className="grid min-w-0">
                  <span className="font-heading text-lg leading-snug font-bold">{c.name}</span>
                  {c.seat && <span className="text-xs text-muted-foreground">{t("metroSeat", lang, { seat: c.seat })}</span>}
                </span>
              </div>
              {c.summary && <p className="line-clamp-3 text-sm text-muted-foreground">{c.summary}</p>}
              <div className="mt-auto grid gap-1.5 border-t pt-3 text-xs">
                <span className="flex items-center gap-1.5"><Church className="size-3.5 text-gold-deep" />{t("metroChurchCount", lang, { n: m.churches })}</span>
                {m.latest && <span className="flex items-start gap-1.5 text-muted-foreground"><Newspaper className="mt-0.5 size-3.5 shrink-0 text-gold-deep" /><span className="line-clamp-2">{m.latest.title}</span></span>}
              </div>
              <ArrowRight className="size-4 justify-self-end text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          )
        })}
      </main>
    </div>
  )
}
