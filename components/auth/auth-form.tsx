"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LangMenu } from "@/components/lang-menu"
import { Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/auth/turnstile"
import { authClient } from "@/lib/auth-client"
import { HONEYPOT_FIELD } from "@/lib/antispam"
import { useT } from "@/components/i18n-provider"
import { localePath, type Locale } from "@/lib/locales"
import type { MessageKey, TFn } from "@/lib/i18n"
import { siteName } from "@/lib/regions"

// Error codes from Better Auth (and lib/auth.ts) with a translated message; others show their own message.
const ERROR_KEYS: Record<string, MessageKey> = {
  INVALID_EMAIL_OR_PASSWORD: "auth.err.INVALID_EMAIL_OR_PASSWORD",
  USER_ALREADY_EXISTS: "auth.err.USER_ALREADY_EXISTS",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "auth.err.USER_ALREADY_EXISTS",
  PASSWORD_TOO_SHORT: "auth.err.PASSWORD_TOO_SHORT",
  BANNED_USER: "auth.err.BANNED_USER",
  EMAIL_NOT_VERIFIED: "auth.err.EMAIL_NOT_VERIFIED",
  MISSING_RESPONSE: "auth.err.MISSING_RESPONSE",
  VERIFICATION_FAILED: "auth.err.VERIFICATION_FAILED",
  INVALID_TOKEN: "auth.err.INVALID_TOKEN",
  EMAIL_NOT_CONFIGURED: "auth.err.EMAIL_NOT_CONFIGURED",
  SPAM_SUSPECTED: "auth.err.SPAM_SUSPECTED",
  DISPOSABLE_EMAIL: "auth.err.DISPOSABLE_EMAIL",
}
export const authMessage = (t: TFn, lang: Locale, e: { code?: string; message?: string; status?: number }) => {
  if (e.status === 429) return t("auth.err.tooMany", lang)
  const key = ERROR_KEYS[e.code ?? ""]
  return key ? t(key, lang) : e.message ?? t("auth.err.generic", lang)
}

/** An internal link in the page's language (/en/login, /ru/login…). */
export const withLang = (href: string, lang: Locale) => localePath(href, lang)

/** Brand and language menu above the sign-in cards; the menu keeps the current address and its parameters. */
export function AuthHeader({ lang }: { lang: Locale }) {
  const path = usePathname().replace(/^\/(en|ru|uk|ro|bg|sr|ka)(?=\/|$)/, "") || "/"
  const params = new URLSearchParams(useSearchParams())
  params.delete("lang")
  return (
    <div className="grid justify-items-center gap-1">
      <Link href={withLang("/", lang)} className="flex items-center justify-center gap-2 font-heading text-xl font-bold">
        <span className="text-primary">☦</span>{siteName(lang)}
      </Link>
      <LangMenu lang={lang} path={params.size ? `${path}?${params}` : path} className="text-xs text-muted-foreground" />
    </div>
  )
}

export function AuthForm({ mode, next, lang }: { mode: "login" | "signup"; next: string; lang: Locale }) {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState("")
  const [captcha, setCaptcha] = useState("")
  const [resetKey, setResetKey] = useState(0)
  const startedAt = useRef(0)
  useEffect(() => { startedAt.current = Date.now() }, []) // when the form appeared (anti-bot timing)
  const signup = mode === "signup"

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (TURNSTILE_SITE_KEY && !captcha) return setError(t("auth.err.MISSING_RESPONSE", lang))
    setError("")
    setPending(true)
    const f = new FormData(e.currentTarget)
    const email = String(f.get("email")).trim()
    const password = String(f.get("password"))
    const headers: Record<string, string> = {
      "x-captcha-response": captcha,
      "x-form-age": String(Math.round((Date.now() - startedAt.current) / 1000)),
      [`x-${HONEYPOT_FIELD}`]: String(f.get(HONEYPOT_FIELD) ?? ""),
    }
    const callbackURL = withLang("/verified", lang) // the confirmation link opens in the same language
    const { data, error } = signup
      ? await authClient.signUp.email({ email, password, name: String(f.get("name")).trim(), callbackURL }, { headers })
      : await authClient.signIn.email({ email, password, callbackURL }, { headers })
    setResetKey((k) => k + 1)
    if (error) { setPending(false); return setError(authMessage(t, lang, error)) }
    if (signup && !data?.user.emailVerified) { setPending(false); return setSentTo(email) }
    // Already confirmed (the first superadmin): sign straight in.
    if (signup) {
      const r = await authClient.signIn.email({ email, password })
      if (r.error) { setPending(false); return setError(authMessage(t, lang, r.error)) }
    }
    setPending(false)
    router.push(next)
    router.refresh()
  }

  const loginHref = withLang(next === "/admin" ? "/login" : `/login?next=${encodeURIComponent(next)}`, lang)
  const signupHref = withLang(next === "/admin" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`, lang)

  if (sentTo) {
    const [before, after] = t("auth.sentConfirm", lang).split("{email}")
    return (
      <Card>
        <CardHeader className="text-center">
          <MailCheck className="mx-auto mb-2 size-10 text-primary" />
          <CardTitle className="font-heading text-xl">{t("auth.checkEmail", lang)}</CardTitle>
          <CardDescription>{before}<b className="text-foreground">{sentTo}</b>{after}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="link" asChild><Link href={loginHref}>{t("auth.goToLogin", lang)}</Link></Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t(signup ? "auth.signup.heading" : "auth.login.heading", lang)}</CardTitle>
        <CardDescription>{t(signup ? "auth.signup.intro" : "auth.login.intro", lang)}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {signup && (
            <div className="grid gap-1.5">
              <Label htmlFor="name">{t("auth.name", lang)}</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">{t("auth.email", lang)}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.password", lang)}</Label>
              {!signup && <Link href={withLang("/forgot-password", lang)} className="text-xs text-muted-foreground underline">{t("auth.forgotLink", lang)}</Link>}
            </div>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} />
          </div>
          {/* Honeypot: hidden from people, filled in by many bots. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>Website<input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" /></label>
          </div>
          <Turnstile onToken={setCaptcha} resetKey={resetKey} />
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}{t(signup ? "auth.signupButton" : "auth.loginButton", lang)}
          </Button>
          <p className="text-sm text-muted-foreground">
            {signup ? <>{t("auth.haveAccount", lang)} <Link href={loginHref} className="text-primary underline">{t("auth.loginLink", lang)}</Link></>
              : <>{t("auth.noAccount", lang)} <Link href={signupHref} className="text-primary underline">{t("auth.signupLink", lang)}</Link></>}
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
