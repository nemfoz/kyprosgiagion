import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative grid min-h-dvh place-items-center bg-muted/40 px-4 py-10">
      <div className="absolute top-3 right-3"><ThemeToggle /></div>
      <div className="grid w-full max-w-sm gap-6">
        <Link href="/" className="flex items-center justify-center gap-2 font-heading text-xl font-bold">
          <span className="text-primary">☦</span>Κύπρος – Αγίων Γη
        </Link>
        {children}
      </div>
    </main>
  )
}
