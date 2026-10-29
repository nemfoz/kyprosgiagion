import Link from "next/link"
import { DEFAULT_EDITION, editionPaths } from "@/lib/editions"
import { headers } from "next/headers"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { localePath } from "@/lib/locales"
import { getSession } from "@/lib/session"

/** Any unknown address (or a church that doesn't exist), in the site's own look with a way back. */
export default async function NotFound() {
  const [h, t, session] = await Promise.all([headers(), getT(), getSession()])
  const lang = langFrom(h.get("x-lang"))
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path="/" signedIn={!!session} />
      <main className="mx-auto grid max-w-md flex-1 content-center justify-items-center gap-4 px-6 py-16 text-center">
        <span aria-hidden className="grid h-20 w-16 place-items-center rounded-t-[40px] rounded-b-xl border bg-accent text-4xl text-primary">☦</span>
        <p className="font-heading text-5xl font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold">{t("nfTitle", lang)}</h1>
        <p className="text-muted-foreground">{t("nfText", lang)}</p>
        <Button asChild size="lg" className="mt-2 h-11"><Link href={localePath(editionPaths(DEFAULT_EDITION).map, lang)}><ArrowLeft />{t("backToMap", lang)}</Link></Button>
      </main>
      <SiteFooter lang={lang} />
    </div>
  )
}
