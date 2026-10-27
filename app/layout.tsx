import type { Metadata } from "next"
import { Noto_Sans, Noto_Serif } from "next/font/google"
import "maplibre-gl/dist/maplibre-gl.css"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"

const sans = Noto_Sans({ variable: "--font-sans", subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })
const serif = Noto_Serif({ variable: "--font-serif", subsets: ["latin", "greek"], weight: ["500", "700"], style: ["normal", "italic"] })

export const metadata: Metadata = {
  title: { default: "Κύπρος – Αγίων Γη", template: "%s – Κύπρος Αγίων Γη" },
  description: "Χάρτης των εκκλησιών και μοναστηριών της Καρπασίας και της επαρχίας Αμμοχώστου.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="el" className={`${sans.variable} ${serif.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
