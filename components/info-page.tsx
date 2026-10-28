import type { Metadata } from "next"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { markdown } from "@/lib/content"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { baseLang, intlLocale } from "@/lib/locales"
import { getSession } from "@/lib/session"
import { getSiteInfo } from "@/lib/site-info"
import { PAGE_TITLE_KEY, pageText, type InfoPage } from "@/lib/pages"
import { alternates, openGraph, pageTitle, plainText } from "@/lib/seo"

// The fixed information pages (app/(info)/*): one component, the texts come from lib/pages.ts or the admin.
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export const infoMetadata = (page: InfoPage) => async ({ searchParams }: Props): Promise<Metadata> => {
  const lang = langFrom((await searchParams).lang)
  const [t, info] = await Promise.all([getT(), getSiteInfo()])
  const title = t(PAGE_TITLE_KEY[page], lang)
  const description = plainText(pageText(info, page, baseLang(lang)).split("\n\n")[0], 200)
  return { title: pageTitle(title, lang), description, alternates: alternates(`/${page}`, lang), openGraph: openGraph(`/${page}`, lang, title, description) }
}

export const infoPage = (page: InfoPage) => async function InfoPageView({ searchParams }: Props) {
  const lang = langFrom((await searchParams).lang)
  const [t, info, session] = await Promise.all([getT(), getSiteInfo(), getSession()])
  const updated = info.updatedAt && new Intl.DateTimeFormat(intlLocale(lang), { day: "numeric", month: "long", year: "numeric" }).format(new Date(info.updatedAt))
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path={`/${page}`} signedIn={!!session} edition={false} />
      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[clamp(28px,4.5vw,42px)] leading-tight font-bold">{t(PAGE_TITLE_KEY[page], lang)}</h1>
        </div>
      </section>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="prose-site" dangerouslySetInnerHTML={{ __html: markdown(pageText(info, page, baseLang(lang))) }} />
        {page === "contact" && (
          <Button asChild size="lg" className="mt-6 h-11"><a href={`mailto:${info.contactEmail}`}><Mail />{info.contactEmail}</a></Button>
        )}
        {updated && ["privacy", "cookies", "terms"].includes(page) && (
          <p className="mt-8 text-xs text-muted-foreground">{t("pageUpdated", lang, { date: updated })}</p>
        )}
      </main>
      <SiteFooter lang={lang} />
    </div>
  )
}
