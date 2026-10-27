import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { after } from "next/server"
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicHeader } from "@/components/public-header"
import { markdown, pick } from "@/lib/content"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { getMetropolis, metropolisPage, refreshStaleNews } from "@/lib/metropolises"
import { getSession } from "@/lib/session"
import { sized } from "@/lib/photo-sizes.mjs"

const domain = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url } }

export async function generateMetadata({ params, searchParams }: PageProps<"/metropolis/[slug]">): Promise<Metadata> {
  const lang = langFrom((await searchParams).lang)
  const m = await getMetropolis({ slug: (await params).slug })
  if (!m) return {}
  return { title: m.content[lang].name || m.content.el.name, description: m.content[lang].summary || m.content.el.summary }
}

export default async function MetropolisPage({ params, searchParams }: PageProps<"/metropolis/[slug]">) {
  const lang = langFrom((await searchParams).lang)
  const other = lang === "el" ? "en" : "el"
  const [t, session, m] = await Promise.all([getT(), getSession(), metropolisPage((await params).slug)])
  if (!m) notFound()
  after(refreshStaleNews)
  const c = m.content
  const field = (f: keyof typeof c.el) => c[lang][f] || c[other][f]
  const q = lang === "en" ? "?lang=en" : ""
  const dateFmt = new Intl.DateTimeFormat(lang === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Nicosia" })

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader lang={lang} otherLangHref={`?lang=${other}`} signedIn={!!session} />
      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-10">
          {m.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.logo} alt="" className="size-24 rounded-xl bg-parchment object-contain p-2" />
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/metropolis${q}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-parchment/85 hover:text-parchment"><ArrowLeft className="size-4" />{t("metroAll", lang)}</Link>
            <h1 className="text-[clamp(26px,4.5vw,42px)] leading-tight font-bold">{field("name")}</h1>
            {field("seat") && <p className="mt-1 text-parchment/85">{t("metroSeat", lang, { seat: field("seat") })}</p>}
          </div>
          {m.website && (
            <Button asChild variant="secondary"><a href={m.website} target="_blank" rel="noopener">{t("metroWebsite", lang)}: {domain(m.website)}<ExternalLink /></a></Button>
          )}
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-10">
          {(field("summary") || field("history")) && (
            <article className="max-w-[72ch]">
              {field("summary") && <p className="mb-6 font-heading text-xl leading-relaxed text-foreground/85">{field("summary")}</p>}
              {field("history") && (
                <>
                  <h2 className="mb-3 text-2xl font-bold">{t("metroHistory", lang)}</h2>
                  <div className="prose-site" dangerouslySetInnerHTML={{ __html: markdown(field("history")) }} />
                </>
              )}
            </article>
          )}

          <section className="grid gap-4">
            <h2 className="text-2xl font-bold">{t("metroChurches", lang)} <span className="text-base font-normal text-muted-foreground">({m.churches.length})</span></h2>
            {m.churches.length === 0 && <p className="text-sm text-muted-foreground">{t("metroNoChurches", lang)}</p>}
            <ul className="grid gap-3 sm:grid-cols-2">
              {m.churches.map((s) => (
                <li key={s.id}>
                  <Link href={`/site/${s.slug}${q}`} className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm">
                    {s.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sized(s.cover, "sm")} alt="" loading="lazy" className="h-16 w-16 rounded-t-[30px] rounded-b-lg object-cover" />
                    ) : (
                      <span className="grid h-16 w-16 place-items-center rounded-t-[30px] rounded-b-lg bg-muted text-2xl text-muted-foreground">✝</span>
                    )}
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate font-heading font-medium">{pick(s.content, lang, "name")}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" />{pick(s.content, lang, "location")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4"><CardTitle className="font-heading text-lg">{t("metroNews", lang)}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 px-4">
              {m.news.length === 0 && <p className="text-sm text-muted-foreground">{t("metroNoNews", lang)}</p>}
              <ul className="grid gap-3">
                {m.news.map((n) => (
                  <li key={n.id} className="grid gap-0.5 border-b pb-3 last:border-0 last:pb-0">
                    {n.publishedAt && <span className="text-xs text-muted-foreground">{dateFmt.format(new Date(n.publishedAt))}</span>}
                    <a href={n.url} target="_blank" rel="noopener" className="text-sm leading-snug font-medium hover:text-primary hover:underline">{n.title}</a>
                    {n.summary && <span className="line-clamp-2 text-xs text-muted-foreground">{n.summary}</span>}
                  </li>
                ))}
              </ul>
              {m.feedUrl && <p className="text-[11px] text-muted-foreground">{t("metroNewsFrom", lang, { domain: domain(m.website || m.feedUrl) })}</p>}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
