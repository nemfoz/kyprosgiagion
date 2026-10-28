import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { Noto_Sans, Noto_Sans_Georgian, Noto_Serif, Noto_Serif_Georgian } from "next/font/google"
import "maplibre-gl/dist/maplibre-gl.css"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/components/i18n-provider"
import { ServiceWorker } from "@/components/service-worker"
import { getOverrides } from "@/lib/i18n-server"
import { SITE_URL } from "@/lib/seo"

// Greek, Latin (with Romanian ș ț) and Cyrillic in Noto; Georgian in its own Noto font (see --font-ui in globals.css).
const sans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin", "latin-ext", "greek", "cyrillic", "cyrillic-ext"], weight: ["400", "500", "600", "700"] })
const serif = Noto_Serif({ variable: "--font-noto-serif", subsets: ["latin", "latin-ext", "greek", "cyrillic", "cyrillic-ext"], weight: ["500", "700"], style: ["normal", "italic"] })
const sansKa = Noto_Sans_Georgian({ variable: "--font-noto-sans-ka", subsets: ["georgian"], weight: ["400", "600", "700"], preload: false })
const serifKa = Noto_Serif_Georgian({ variable: "--font-noto-serif-ka", subsets: ["georgian"], weight: ["500", "700"], preload: false })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Κύπρος – Αγίων Γη", template: "%s – Κύπρος Αγίων Γη" },
  description: "Χάρτης των εκκλησιών και μοναστηριών της Καρπασίας και της επαρχίας Αμμοχώστου.",
  appleWebApp: { capable: true, title: "Αγίων Γη", statusBarStyle: "default" },
}

// viewportFit "cover" lets the pages use the full iPhone screen; the list sheet and the map card pad
// themselves with env(safe-area-inset-bottom) so nothing sits under the home bar.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#6b1d1d" }

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [overrides, lang] = await Promise.all([getOverrides(), headers().then((h) => h.get("x-lang") ?? "el")])
  return (
    <html lang={lang} className={`${sans.variable} ${serif.variable} ${sansKa.variable} ${serifKa.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider overrides={overrides}><TooltipProvider>{children}</TooltipProvider></I18nProvider>
        <Toaster position="bottom-center" richColors />
        <ServiceWorker />
      </body>
    </html>
  )
}
