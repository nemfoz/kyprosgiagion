"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const LABEL = { el: "Φωτεινό / σκούρο θέμα", en: "Light / dark theme" }

/** Sun/moon button. Icons swap with CSS and the label is fixed, so the server render always matches. */
export function ThemeToggle({ lang = "el" }: { lang?: "el" | "en" }) {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={LABEL[lang]} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          <Moon className="dark:hidden" />
          <Sun className="hidden dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{LABEL[lang]}</TooltipContent>
    </Tooltip>
  )
}
