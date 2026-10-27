// The brand and the language switch are drawn by each page (AuthHeader), which knows the language.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative grid min-h-dvh place-items-center bg-muted/40 px-4 py-10">
      <div className="grid w-full max-w-sm gap-6">{children}</div>
    </main>
  )
}
