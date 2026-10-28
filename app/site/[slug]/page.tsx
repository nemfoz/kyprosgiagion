import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, MapPin, Navigation, Pencil, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gallery } from "@/components/site/gallery"
import { ShareButton } from "@/components/site/share-button"
import { MiniMap } from "@/components/map/mini-map"
import { CompletenessCard } from "@/components/gamify/completeness-card"
import { completeness } from "@/lib/completeness"
import { TypeBadge } from "@/components/type-badge"
import { googleMapsUrl, headings, inline, markdown, parseFacts, pick, translatedInto, TYPE_LABELS, youtubeEmbed, type Lang, type SiteType } from "@/lib/content"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { PublicHeader } from "@/components/public-header"
import { isAdmin } from "@/lib/permissions"
import { regionName, regions } from "@/lib/regions"
import { getPointsConfig } from "@/lib/points"
import { publicMetropolis, metroText } from "@/lib/metropolises"
import { getSession } from "@/lib/session"
import { nearbySites, publicSite } from "@/lib/sites"
import { sized } from "@/lib/photo-sizes.mjs"
import { alternates, jsonLd, openGraph, pageTitle, plainText, SITE_URL } from "@/lib/seo"
import { baseLang, isExtra, localePath, tr } from "@/lib/locales"
import { directionsUrl, formatDistance } from "@/lib/geo"
import { trData } from "@/lib/i18n"

async function load(slug: string) {
  const [site, session] = await Promise.all([publicSite(slug), getSession()])
  const admin = isAdmin(session?.user.role)
  if (!site || (!site.published && !admin)) notFound()
  return { site, session, admin }
}

export async function generateMetadata({ params, searchParams }: PageProps<"/site/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const lang = langFrom((await searchParams).lang)
  const site = await publicSite(slug)
  if (!site) return {}
  const path = `/site/${site.slug}`
  const title = pick(site.content, lang, "name")
  const description = plainText(pick(site.content, lang, "summary"))
  return {
    title: pageTitle(title, lang), description,
    alternates: alternates(path, lang, ["el", "en", ...translatedInto(site.content)]),
    openGraph: { ...openGraph(path, lang, title, description), type: "article" },
    twitter: { card: "summary_large_image" },
    robots: site.published ? undefined : { index: false },
  }
}

export default async function SitePage({ params, searchParams }: PageProps<"/site/[slug]">) {
  const { slug } = await params
  const lang = langFrom((await searchParams).lang)
  // The second name under the title: English on Greek pages, otherwise the Greek original.
  const other: Lang = lang === "el" ? "en" : "el"
  const [{ site, session, admin }, t] = await Promise.all([load(slug), getT()])
  const untranslated = isExtra(lang) && !translatedInto(site.content).includes(lang)
  const [metropolis, nearby, cfg] = await Promise.all([
    site.metropolisId ? publicMetropolis(site.metropolisId) : null,
    nearbySites(site),
    session ? getPointsConfig() : null, // completeness is for signed-in contributors only
  ])
  const c = site.content
  const region = regions.find((r) => r.id === site.region)
  const facts = parseFacts(pick(c, lang, "facts"))
  // The linked Metropolis replaces a typed "Μητρόπολη: …" line in the facts.
  const shownFacts = metropolis ? facts.filter(([k]) => !/^(Μητρόπολη|Metropolis)$/i.test(k)) : facts
  const sources = pick(c, lang, "sources").split("\n").map((s) => s.trim()).filter(Boolean)
  const cover = site.photos[0]
  const name = pick(c, lang, "name")
  const altName = c[other].name
  const score = cfg && completeness({ content: c, coordsVerified: site.coordsVerified, photoCount: site.photos.length }, cfg)

  // Phones: links to the parts of a long page, in a bar that stays at the top.
  const sections = [
    ...headings(pick(c, lang, "body")).map((h, i) => ({ id: `s${i + 1}`, label: h })),
    ...(site.videos.length ? [{ id: "videos", label: t("videos", lang) }] : []),
    ...(site.photos.length ? [{ id: "photos", label: t("photos", lang) }] : []),
    { id: "details", label: t("details", lang) },
    ...(sources.length ? [{ id: "sources", label: t("sources", lang) }] : []),
    { id: "map", label: t("map", lang) },
  ]

  const photos = site.photos.map((p) => ({
    src: p.src,
    caption: (lang === "el" ? p.captionEl || p.captionEn : p.captionEn || p.captionEl) || "", // captions: Greek and English only
    credit: p.credit,
    sourceUrl: p.sourceUrl,
    historic: p.historic,
  }))

  // schema.org description for search engines (https://schema.org/Church).
  const ld = {
    "@context": "https://schema.org",
    "@type": site.type === "monastery" ? "PlaceOfWorship" : "Church",
    name,
    alternateName: altName && altName !== name ? altName : undefined,
    description: plainText(pick(c, lang, "summary")) || undefined,
    url: SITE_URL + localePath(`/site/${site.slug}`, lang),
    image: site.photos.slice(0, 3).map((p) => (p.src.startsWith("/") ? SITE_URL + p.src : p.src)),
    geo: { "@type": "GeoCoordinates", latitude: site.lat, longitude: site.lng },
    address: { "@type": "PostalAddress", addressLocality: pick(c, lang, "location") || undefined, addressRegion: region && regionName(region, lang), addressCountry: "CY" },
    hasMap: googleMapsUrl(site.lat, site.lng),
    containedInPlace: metropolis ? { "@type": "Organization", name: metroText(metropolis, "name", lang), url: SITE_URL + localePath(`/metropolis/${metropolis.slug}`, lang) } : undefined,
    inLanguage: untranslated ? "en" : lang,
  }

  return (
    <div className="min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <PublicHeader lang={lang} path={`/site/${site.slug}`} signedIn={!!session}>
        {session && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/sites/${site.id}`} aria-label={admin ? t("edit", lang) : t("propose", lang)}>
              <Pencil /><span className="hidden lg:inline">{admin ? t("edit", lang) : t("propose", lang)}</span>
            </Link>
          </Button>
        )}
      </PublicHeader>

      {!site.published && <div className="bg-gold/20 py-2 text-center text-sm font-semibold text-foreground">{t("draft", lang)}</div>}
      {untranslated && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-accent px-4 py-2 text-center text-sm">
          <span>{t("notTranslated", lang)}</span>
          <Link href={session ? `/admin/sites/${site.id}?translate=${lang}` : localePath("/signup", lang)} className="font-semibold text-primary underline underline-offset-2">
            {t("translatePage", lang)}
          </Link>
        </div>
      )}

      <section className={`relative flex items-end overflow-hidden ${cover ? "h-[min(56vh,520px)] bg-foreground" : "bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)]"}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.src} srcSet={`${sized(cover.src, "md")} 960w, ${cover.src} 2400w`} sizes="100vw" alt={photos[0].caption || name} className="absolute inset-0 size-full object-cover opacity-85" />
        )}
        {cover && <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />}
        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 text-parchment">
          <Link href={localePath(`/?site=${encodeURIComponent(site.slug)}`, lang)} className="mb-3 inline-flex items-center gap-1.5 text-sm text-parchment/85 hover:text-parchment">
            <ArrowLeft className="size-4" />{t("backToMap", lang)}
          </Link>
          <TypeBadge type={site.type as SiteType} lang={lang} className="block text-gold [&>span]:bg-gold" />
          <h1 className="mt-2 text-[clamp(28px,5vw,46px)] leading-tight font-bold">{name}</h1>
          {altName && altName !== name && <p className="font-heading text-lg italic opacity-85">{altName}</p>}
          <p className="mt-1.5 opacity-90">{pick(c, lang, "location")}{region ? ` · ${regionName(region, lang)}` : ""}</p>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pt-5">
        <Button asChild className="h-10">
          <a href={directionsUrl(site.lat, site.lng)} target="_blank" rel="noopener"><Navigation />{t("directions", lang)}</a>
        </Button>
        <ShareButton title={name} label={t("share", lang)} copied={t("linkCopied", lang)} />
      </div>

      {sections.length >= 4 && (
        <nav aria-label={t("sections", lang)} className="sticky top-0 z-20 mt-4 border-y bg-background/95 backdrop-blur lg:hidden">
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
            {sections.map((x) => (
              <a key={x.id} href={`#${x.id}`} className="flex h-9 shrink-0 items-center rounded-full border bg-card px-3.5 text-sm whitespace-nowrap hover:bg-accent">{x.label}</a>
            ))}
          </div>
        </nav>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-6 pb-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12 lg:pt-8">
        <article className="min-w-0 max-w-[72ch]">
          {pick(c, lang, "summary") && (
            <p className="mb-6 font-heading text-xl leading-relaxed text-foreground/85" dangerouslySetInnerHTML={{ __html: inline(pick(c, lang, "summary")) }} />
          )}
          <div className="prose-site" dangerouslySetInnerHTML={{ __html: markdown(pick(c, lang, "body")) }} />

          {site.videos.length > 0 && (
            <>
              <h2 id="videos" className="mt-10 mb-4 scroll-mt-16 text-2xl font-bold">{t("videos", lang)}</h2>
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
              <h2 id="photos" className="mt-10 mb-4 scroll-mt-16 text-2xl font-bold">{t("photos", lang)}</h2>
              <Gallery photos={photos} alt={name} sourceLabel={t("photoSource", lang)} historicLabel={t("historicPhoto", lang)} />
            </>
          )}

          {sources.length > 0 && (
            <>
              <h2 id="sources" className="mt-10 mb-3 scroll-mt-16 text-2xl font-bold">{t("sources", lang)}</h2>
              <ol className="sources list-decimal space-y-1.5 pl-5">
                {sources.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(s) }} />)}
              </ol>
            </>
          )}
        </article>

        {/* Right of the text and sticky on wide screens; after the text on phones. */}
        <aside id="details" className="grid scroll-mt-16 content-start gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <Card className="gap-2 py-4">
            <CardHeader className="px-4"><CardTitle className="font-heading text-base">{t("details", lang)}</CardTitle></CardHeader>
            <CardContent className="px-4">
              <dl className="grid text-[13px] leading-snug">
                <Fact label={t("type", lang)}>{trData(`data.type.${site.type}`, TYPE_LABELS[site.type as SiteType], lang) || site.type}</Fact>
                {pick(c, lang, "location") && <Fact label={t("location", lang)}>{pick(c, lang, "location")}</Fact>}
                {metropolis && (
                  <Fact label={t("metropolis", lang)}>
                    <Link href={localePath(`/metropolis/${metropolis.slug}`, lang)}>{metroText(metropolis, "name", lang)}</Link>
                  </Fact>
                )}
                {shownFacts.map(([k, v], i) => <Fact key={i} label={k}><span dangerouslySetInnerHTML={{ __html: inline(v) }} /></Fact>)}
              </dl>
              <a href="#map" className="mt-3 flex items-center gap-1.5 text-[13px] text-primary underline underline-offset-2"><MapPin className="size-3.5" />{t("onMap", lang)}</a>
            </CardContent>
          </Card>
          {nearby.length > 0 && (
            <Card className="gap-2 py-4">
              <CardHeader className="px-4"><CardTitle className="font-heading text-base">{t("nearby", lang)}</CardTitle></CardHeader>
              <CardContent className="grid gap-1 px-2">
                {nearby.map((s) => (
                  <Link key={s.id} href={localePath(`/site/${s.slug}`, lang)} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                    {s.cover
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={sized(s.cover, "sm")} alt="" loading="lazy" className="h-12 w-11 shrink-0 rounded-t-[22px] rounded-b-md object-cover" />
                      : <span className="grid h-12 w-11 shrink-0 place-items-center rounded-t-[22px] rounded-b-md bg-muted text-gold-deep">✝</span>}
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-[13px] leading-snug font-medium">{tr(s.name, lang)}</span>
                      <span className="block text-xs text-muted-foreground">{formatDistance(s.km, lang)}</span>
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {score && cfg && <CompletenessCard score={score} bonuses={cfg.bonuses} siteId={site.id} lang={baseLang(lang)} />}
        </aside>
      </main>

      {/* The map closes the page, edge to edge. */}
      <section id="map" className="relative h-[min(65vh,560px)] scroll-mt-12 border-t bg-muted lg:scroll-mt-4">
        <MiniMap lat={site.lat} lng={site.lng} type={site.type} boundary={region?.boundary} lang={baseLang(lang)} className="h-full rounded-none" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-4 md:pb-8">
          <div className="pointer-events-auto grid max-w-sm gap-1.5 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur md:gap-2 md:p-4">
            <p className="font-heading text-base leading-snug font-bold md:text-lg">{name}</p>
            <p className="text-sm text-muted-foreground">{pick(c, lang, "location")}{region ? ` · ${regionName(region, lang)}` : ""}</p>
            <p className="font-mono text-xs text-muted-foreground">{site.lat.toFixed(6)}, {site.lng.toFixed(6)}</p>
            {!site.coordsVerified && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><TriangleAlert className="size-3.5 text-gold" />{t("approx", lang)}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="max-md:h-9">
                <a href={directionsUrl(site.lat, site.lng)} target="_blank" rel="noopener"><Navigation />{t("directions", lang)}</a>
              </Button>
              <Button asChild size="sm" variant="outline" className="max-md:h-9">
                <a href={googleMapsUrl(site.lat, site.lng)} target="_blank" rel="noopener"><MapPin />{t("openMaps", lang)}<ExternalLink /></a>
              </Button>
            </div>
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
