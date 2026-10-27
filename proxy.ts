import { NextResponse, type NextRequest } from "next/server"
import { isLocale, localePath } from "@/lib/locales"

// Language prefixes: /en/site/x is served by /site/x with ?lang=en (Greek has no prefix).
// Old links with ?lang=… are redirected to the prefixed address.
const PREFIXED = /^\/(en|ru|uk|ro|bg|sr|ka)(\/.*)?$/

export function proxy(req: NextRequest) {
  const url = req.nextUrl
  const m = PREFIXED.exec(url.pathname)
  if (m) {
    const target = url.clone()
    target.pathname = m[2] || "/"
    target.searchParams.set("lang", m[1])
    const headers = new Headers(req.headers)
    headers.set("x-lang", m[1]) // for <html lang> in the root layout
    return NextResponse.rewrite(target, { request: { headers } })
  }
  const lang = url.searchParams.get("lang")
  if (lang !== null && req.method === "GET") {
    const target = url.clone()
    target.searchParams.delete("lang")
    if (isLocale(lang)) target.pathname = localePath(url.pathname, lang)
    return NextResponse.redirect(target, 308)
  }
}

export const config = {
  // Pages only: not the API, Next's files, photos, the admin area or files with an extension.
  matcher: ["/((?!api/|_next/|media/|uploads/|admin|.*\\.[a-zA-Z0-9]+$).*)"],
}
