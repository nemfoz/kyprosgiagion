import Link from "next/link"
import { getT } from "@/lib/i18n-server"
import { localePath, type Locale } from "@/lib/locales"
import { brandName } from "@/lib/editions"
import { getSiteInfo } from "@/lib/site-info"
import { INFO_PAGES, PAGE_TITLE_KEY } from "@/lib/pages"
import { FooterCredits } from "@/components/footer-credits"

/** Footer of the public pages (the map has a short version in its list, see Explorer): information pages and credits. */
export async function SiteFooter({ lang }: { lang: Locale }) {
  const [t, info] = await Promise.all([getT(), getSiteInfo()])
  return (
    <footer className="mt-auto border-t bg-card text-sm">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:grid-cols-[1fr_auto] md:items-center">
        <nav aria-label={brandName(lang)} className="flex flex-wrap gap-x-5 gap-y-2">
          {INFO_PAGES.map((p) => (
            <Link key={p} href={localePath(`/${p}`, lang)} className="text-muted-foreground hover:text-primary">{t(PAGE_TITLE_KEY[p], lang)}</Link>
          ))}
        </nav>
        <FooterCredits foundationUrl={info.foundationUrl} project={t("footerProject", lang, { foundation: "\u0000" })} poweredBy={t("footerPoweredBy", lang)} />
      </div>
    </footer>
  )
}
