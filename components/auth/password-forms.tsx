"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authMessage, withLang } from "@/components/auth/auth-form"
import { useT } from "@/components/i18n-provider"
import type { Locale } from "@/lib/locales"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/auth/turnstile"
import { authClient } from "@/lib/auth-client"

export function PasswordForms({ mode, lang, token = "", error: initialError = "" }: {
  mode: "request" | "reset"; lang: Locale; token?: string; error?: string
}) {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState(initialError ? t("auth.err.INVALID_TOKEN", lang) : "")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [captcha, setCaptcha] = useState("")
  const [resetKey, setResetKey] = useState(0)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError("")
    if (mode === "request") {
      if (TURNSTILE_SITE_KEY && !captcha) return setError(t("auth.err.MISSING_RESPONSE", lang))
      setPending(true)
      const { error } = await authClient.requestPasswordReset(
        { email: String(f.get("email")).trim(), redirectTo: withLang("/reset-password", lang) },
        { headers: { "x-captcha-response": captcha } },
      )
      setPending(false)
      setResetKey((k) => k + 1)
      if (error) return setError(authMessage(t, lang, error))
      return setSent(true)
    }
    const password = String(f.get("password"))
    if (password !== String(f.get("confirm"))) return setError(t("auth.reset.mismatch", lang))
    setPending(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setPending(false)
    if (error) return setError(authMessage(t, lang, error))
    toast.success(t("auth.reset.done", lang))
    router.push(withLang("/login", lang))
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <MailCheck className="mx-auto mb-2 size-10 text-primary" />
          <CardTitle className="font-heading text-xl">{t("auth.checkEmail", lang)}</CardTitle>
          <CardDescription>{t("auth.forgot.sent", lang)}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t(mode === "request" ? "auth.forgot.heading" : "auth.reset.heading", lang)}</CardTitle>
        <CardDescription>{t(mode === "request" ? "auth.forgot.intro" : "auth.reset.intro", lang)}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {mode === "request" ? (
            <>
              <div className="grid gap-1.5"><Label htmlFor="email">{t("auth.email", lang)}</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
              <Turnstile onToken={setCaptcha} resetKey={resetKey} />
            </>
          ) : (
            <>
              <div className="grid gap-1.5"><Label htmlFor="password">{t("auth.reset.newPassword", lang)}</Label><Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /></div>
              <div className="grid gap-1.5"><Label htmlFor="confirm">{t("auth.reset.confirm", lang)}</Label><Input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" /></div>
            </>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" size="lg" disabled={pending || (mode === "reset" && !token)}>
            {pending && <Loader2 className="animate-spin" />}{t(mode === "request" ? "auth.forgot.send" : "auth.reset.save", lang)}
          </Button>
          <Link href={withLang("/login", lang)} className="text-sm text-muted-foreground underline">{t("auth.backToLogin", lang)}</Link>
        </CardFooter>
      </form>
    </Card>
  )
}
