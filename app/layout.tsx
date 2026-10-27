import type { Metadata } from "next"
import { Noto_Sans, Noto_Serif } from "next/font/google"
import "maplibre-gl/dist/maplibre-gl.css"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/components/i18n-provider"
import { getOverrides } from "@/lib/i18n-server"
import { SITE_URL } from "@/lib/seo"

const sans = Noto_Sans({ variable: "--font-sans", subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })
const serif = Noto_Serif({ variable: "--font-serif", subsets: ["latin", "greek"], weight: ["500", "700"], style: ["normal", "italic"] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Κύπρος – Αγίων Γη", template: "%s – Κύπρος Αγίων Γη" },
  description: "Χάρτης των εκκλησιών και μοναστηριών της Καρπασίας και της επαρχίας Αμμοχώστου.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const overrides = await getOverrides()
  return (
    <html lang="el" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider overrides={overrides}><TooltipProvider>{children}</TooltipProvider></I18nProvider>
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}
