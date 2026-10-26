import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, MapPin, Pencil, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gallery } from "@/components/site/gallery"
import { MiniMap } from "@/components/map/mini-map"
import { TypeBadge } from "@/components/type-badge"
import { googleMapsUrl, inline, markdown, parseFacts, pick, TYPE_LABELS, type Lang, type SiteType } from "@/lib/content"
import { langFrom, t } from "@/lib/i18n"
import { isAdmin } from "@/lib/permissions"
import { regions, siteTitle } from "@/lib/regions"
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

  const photos = site.photos.map((p) => ({
    src: p.src,
    caption: (lang === "el" ? p.captionEl || p.captionEn : p.captionEn || p.captionEl) || "",
    credit: p.credit,
    sourceUrl: p.sourceUrl,
  }))

  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
        <Link href={`/${q}`} className="flex items-center gap-2 font-heading text-lg font-bold">
          <span className="text-primary">☦</span>{siteTitle[lang]}
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {session && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/sites/${site.id}`}><Pencil />{admin ? t("edit", lang) : t("propose", lang)}</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild><Link href={`?lang=${other}`}>{other === "en" ? "EN" : "ΕΛ"}</Link></Button>
        </div>
      </header>

      {!site.published && <div className="bg-amber-100 py-2 text-center text-sm font-semibold text-amber-900">{t("draft", lang)}</div>}

      <section className={`relative flex items-end overflow-hidden ${cover ? "h-[min(56vh,520px)] bg-foreground" : "bg-linear-to-br from-[#3b1b1f] to-primary"}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.src} alt={photos[0].caption || name} className="absolute inset-0 size-full object-cover opacity-85" />
        )}
        {cover && <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />}
        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 text-white">
          <Link href={`/?site=${encodeURIComponent(site.slug)}${lang === "en" ? "&lang=en" : ""}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white">
            <ArrowLeft className="size-4" />{t("backToMap", lang)}
          </Link>
          <TypeBadge type={site.type as SiteType} lang={lang} className="block text-amber-200 [&>span]:bg-amber-200" />
          <h1 className="mt-2 text-[clamp(28px,5vw,46px)] leading-tight font-bold">{name}</h1>
          {altName && altName !== name && <p className="font-heading text-lg italic opacity-85">{altName}</p>}
          <p className="mt-1.5 opacity-90">{pick(c, lang, "location")}{region ? ` · ${region.name[lang]}` : ""}</p>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-16 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="max-w-[72ch]">
          {pick(c, lang, "summary") && (
            <p className="mb-6 font-heading text-xl leading-relaxed text-foreground/85" dangerouslySetInnerHTML={{ __html: inline(pick(c, lang, "summary")) }} />
          )}
          <div className="prose-site" dangerouslySetInnerHTML={{ __html: markdown(pick(c, lang, "body")) }} />

          {photos.length > 0 && (
            <>
              <h2 className="mt-10 mb-4 text-2xl font-bold">{t("photos", lang)}</h2>
              <Gallery photos={photos} alt={name} sourceLabel={t("photoSource", lang)} />
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

        <aside className="grid content-start gap-4 lg:sticky lg:top-4">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">{t("details", lang)}</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-0.5 text-sm">
                <Fact label={t("type", lang)}>{TYPE_LABELS[site.type as SiteType]?.[lang] ?? site.type}</Fact>
                {pick(c, lang, "location") && <Fact label={t("location", lang)}>{pick(c, lang, "location")}</Fact>}
                {facts.map(([k, v], i) => <Fact key={i} label={k}><span dangerouslySetInnerHTML={{ __html: inline(v) }} /></Fact>)}
                <Fact label={t("coords", lang)}><span className="font-mono text-[13px]">{site.lat.toFixed(6)}, {site.lng.toFixed(6)}</span></Fact>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-3">
              <MiniMap lat={site.lat} lng={site.lng} type={site.type} boundary={region?.boundary} lang={lang} />
              {!site.coordsVerified && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><TriangleAlert className="size-4 text-gold" />{t("approx", lang)}</p>
              )}
              <Button asChild size="lg">
                <a href={googleMapsUrl(site.lat, site.lng)} target="_blank" rel="noopener"><MapPin />{t("openMaps", lang)}<ExternalLink /></a>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      {label && <dt className="mt-2.5 text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>}
      <dd className="[&_a]:text-primary [&_a]:underline">{children}</dd>
    </>
  )
}
