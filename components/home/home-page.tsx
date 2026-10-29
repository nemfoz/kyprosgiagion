import type { Metadata } from "next"
import { PublicHeader } from "@/components/public-header"
import { SiteFooter } from "@/components/site-footer"
import { brandName } from "@/lib/editions"
import { homeData } from "@/lib/home"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { getSession } from "@/lib/session"

// What every home page version loads, and its frame (header, footer). The versions are previews: not indexed.
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function homeContext(searchParams: SearchParams) {
  const lang = langFrom((await searchParams).lang)
  const [t, session, data] = await Promise.all([getT(), getSession(), homeData()])
  return { lang, t, session, data }
}

export const versionMetadata = async ({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> => {
  const lang = langFrom((await searchParams).lang)
  const t = await getT()
  return { title: { absolute: `${brandName(lang)} – ${t("tagline", lang)}` }, robots: { index: false } }
}

export function HomeFrame({ lang, path, signedIn, children }: { lang: Parameters<typeof brandName>[0]; path: string; signedIn: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader lang={lang} path={path} signedIn={signedIn} edition={false} />
      {children}
      <SiteFooter lang={lang} />
    </div>
  )
}
