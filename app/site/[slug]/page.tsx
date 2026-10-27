import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, MapPin, Pencil, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gallery } from "@/components/site/gallery"
import { MiniMap } from "@/components/map/mini-map"
import { CompletenessCard } from "@/components/gamify/completeness-card"
import { completeness } from "@/lib/completeness"
import { TypeBadge } from "@/components/type-badge"
import { googleMapsUrl, inline, markdown, parseFacts, pick, TYPE_LABELS, youtubeEmbed, type Lang, type SiteType } from "@/lib/content"
import { langFrom, t } from "@/lib/i18n"
import { isAdmin } from "@/lib/permissions"
import { regions, siteTitle } from "@/lib/regions"
import { getPointsConfig } from "@/lib/points"
import { getSession } from "@/lib/session"
import { getSite } from "@/lib/sites"

async function load(slug: string) {
  const [site, session] = await Promise.all([getSite({ slug }), getSession()])
  const admin = isAdmin(session?.user.role)
  if (!site || (!site.published && !admin)) notFound()
  return { site, session, admin }
}

export async function generateMetadata({ params, searchParams }: PageProps<"/site/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const lang = langFrom((await searchParams).lang)
  const site = await getSite({ slug })
  if (!site) return {}
  return { title: pick(site.content, lang, "name"), description: pick(site.content, lang, "summary") }
}

export default async function SitePage({ params, searchParams }: PageProps<"/site/[slug]">) {
  const { slug } = await params
  const lang: Lang = langFrom((await searchParams).lang)
  const other: Lang = lang === "el" ? "en" : "el"
  const { site, session, admin } = await load(slug)
  const c = site.content
  const region = regions.find((r) => r.id === site.region)
  const facts = parseFacts(pick(c, lang, "facts"))
  const sources = pick(c, lang, "sources").split("\n").map((s) => s.trim()).filter(Boolean)
  const cover = site.photos[0]
  const name = pick(c, lang, "name")
  const altName = c[other].name
  const q = lang === "en" ? "?lang=en" : ""
  // Completeness is for signed-in contributors only.
  const cfg = session ? await getPointsConfig() : null
  const score = cfg && completeness({ content: c, coordsVerified: site.coordsVerified, photoCount: site.photos.length }, cfg)

  const photos = site.photos.map((p) => ({
    src: p.src,
    caption: (lang === "el" ? p.captionEl || p.captionEn : p.captionEn || p.captionEl) || "",
    credit: p.credit,
    sourceUrl: p.sourceUrl,
    historic: p.historic,
  }))

  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
        <Link href={`/${q}`} className="flex min-w-0 items-center gap-2 font-heading text-lg font-bold">
          <span className="text-primary">☦</span><span className="truncate">{siteTitle[lang]}</span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" asChild><Link href={`/contribute${q}`}>{t("contribute", lang)}</Link></Button>
          {session && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/sites/${site.id}`}><Pencil />{admin ? t("edit", lang) : t("propose", lang)}</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild><Link href={`?lang=${other}`}>{other === "en" ? "EN" : "ΕΛ"}</Link></Button>
        </div>
      </header>

      {!site.published && <div className="bg-gold/20 py-2 text-center text-sm font-semibold text-foreground">{t("draft", lang)}</div>}

      <section className={`relative flex items-end overflow-hidden ${cover ? "h-[min(56vh,520px)] bg-foreground" : "bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)]"}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.src} alt={photos[0].caption || name} className="absolute inset-0 size-full object-cover opacity-85" />
        )}
        {cover && <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />}
        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 text-parchment">
          <Link href={`/?site=${encodeURIComponent(site.slug)}${lang === "en" ? "&lang=en" : ""}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-parchment/85 hover:text-parchment">
            <ArrowLeft className="size-4" />{t("backToMap", lang)}
          </Link>
          <TypeBadge type={site.type as SiteType} lang={lang} className="block text-gold [&>span]:bg-gold" />
          <h1 className="mt-2 text-[clamp(28px,5vw,46px)] leading-tight font-bold">{name}</h1>
          {altName && altName !== name && <p className="font-heading text-lg italic opacity-85">{altName}</p>}
          <p className="mt-1.5 opacity-90">{pick(c, lang, "location")}{region ? ` · ${region.name[lang]}` : ""}</p>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-12 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <article className="max-w-[72ch] lg:order-2">
          {pick(c, lang, "summary") && (
            <p className="mb-6 font-heading text-xl leading-relaxed text-foreground/85" dangerouslySetInnerHTML={{ __html: inline(pick(c, lang, "summary")) }} />
          )}
          <div className="prose-site" dangerouslySetInnerHTML={{ __html: markdown(pick(c, lang, "body")) }} />

          {site.videos.length > 0 && (
            <>
              <h2 className="mt-10 mb-4 text-2xl font-bold">{t("videos", lang)}</h2>
              <div className="grid gap-5">
                {site.videos.map((v) => {
                  const title = (lang === "el" ? v.titleEl || v.titleEn : v.titleEn || v.titleEl) || ""
                  return (
                    <figure key={v.id}>
                      <div className="video-embed !mb-1.5">
                        <iframe src={youtubeEmbed(v.youtubeId)} title={title || name} loading="lazy" allowFullScreen
                          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
                      </div>
                      {title && <figcaption className="text-[13px] text-muted-foreground">{title}</figcaption>}
                    </figure>
                  )
                })}
              </div>
            </>
          )}

          {photos.length > 0 && (
            <>
              <h2 className="mt-10 mb-4 text-2xl font-bold">{t("photos", lang)}</h2>
              <Gallery photos={photos} alt={name} sourceLabel={t("photoSource", lang)} historicLabel={t("historicPhoto", lang)} />
            </>
          )}

          {sources.length > 0 && (
            <>
              <h2 className="mt-10 mb-3 text-2xl font-bold">{t("sources", lang)}</h2>
              <ol className="sources list-decimal space-y-1.5 pl-5">
                {sources.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(s) }} />)}
              </ol>
            </>
          )}
        </article>

        {/* Sticky on wide screens; after the text on phones. */}
        <aside className="grid content-start gap-3 lg:sticky lg:top-4 lg:order-1 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <Card className="gap-2 py-4">
            <CardHeader className="px-4"><CardTitle className="font-heading text-base">{t("details", lang)}</CardTitle></CardHeader>
            <CardContent className="px-4">
              <dl className="grid text-[13px] leading-snug">
                <Fact label={t("type", lang)}>{TYPE_LABELS[site.type as SiteType]?.[lang] ?? site.type}</Fact>
                {pick(c, lang, "location") && <Fact label={t("location", lang)}>{pick(c, lang, "location")}</Fact>}
                {facts.map(([k, v], i) => <Fact key={i} label={k}><span dangerouslySetInnerHTML={{ __html: inline(v) }} /></Fact>)}
              </dl>
              <a href="#map" className="mt-3 flex items-center gap-1.5 text-[13px] text-primary underline underline-offset-2"><MapPin className="size-3.5" />{t("onMap", lang)}</a>
            </CardContent>
          </Card>
          {score && cfg && <CompletenessCard score={score} bonuses={cfg.bonuses} siteId={site.id} lang={lang} />}
        </aside>
      </main>

      {/* The map closes the page, edge to edge. */}
      <section id="map" className="relative h-[min(65vh,560px)] scroll-mt-4 border-t bg-muted">
        <MiniMap lat={site.lat} lng={site.lng} type={site.type} boundary={region?.boundary} lang={lang} className="h-full rounded-none" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-8">
          <div className="pointer-events-auto grid max-w-sm gap-2 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur">
            <p className="font-heading text-lg leading-snug font-bold">{name}</p>
            <p className="text-sm text-muted-foreground">{pick(c, lang, "location")}{region ? ` · ${region.name[lang]}` : ""}</p>
            <p className="font-mono text-xs text-muted-foreground">{site.lat.toFixed(6)}, {site.lng.toFixed(6)}</p>
            {!site.coordsVerified && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><TriangleAlert className="size-3.5 text-gold" />{t("approx", lang)}</p>
            )}
            <Button asChild size="sm" className="justify-self-start">
              <a href={googleMapsUrl(site.lat, site.lng)} target="_blank" rel="noopener"><MapPin />{t("openMaps", lang)}<ExternalLink /></a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      {label && <dt className="mt-2 text-[11px] tracking-wide text-muted-foreground uppercase first:mt-0">{label}</dt>}
      <dd className="[&_a]:text-primary [&_a]:underline">{children}</dd>
    </>
  )
}
