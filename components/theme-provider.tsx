"use client"

import { ThemeProvider as NextThemes } from "next-themes"

/** Light by default; the visitor's choice is remembered (localStorage). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemes>
  )
}
