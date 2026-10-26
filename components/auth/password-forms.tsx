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
import { authMessage, AUTH_MESSAGES } from "@/components/auth/auth-form"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/auth/turnstile"
import { authClient } from "@/lib/auth-client"

export function PasswordForms({ mode, token = "", error: initialError = "" }: { mode: "request" | "reset"; token?: string; error?: string }) {
  const router = useRouter()
  const [error, setError] = useState(initialError ? AUTH_MESSAGES.INVALID_TOKEN : "")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [captcha, setCaptcha] = useState("")
  const [resetKey, setResetKey] = useState(0)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError("")
    if (mode === "request") {
      if (TURNSTILE_SITE_KEY && !captcha) return setError(AUTH_MESSAGES.MISSING_RESPONSE)
      setPending(true)
      const { error } = await authClient.requestPasswordReset(
        { email: String(f.get("email")).trim(), redirectTo: "/reset-password" },
        { headers: { "x-captcha-response": captcha } },
      )
      setPending(false)
      setResetKey((k) => k + 1)
      if (error) return setError(authMessage(error))
      return setSent(true)
    }
    const password = String(f.get("password"))
    if (password !== String(f.get("confirm"))) return setError("Οι δύο κωδικοί δεν ταιριάζουν.")
    setPending(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setPending(false)
    if (error) return setError(authMessage(error))
    toast.success("Ο κωδικός άλλαξε. Συνδεθείτε με τον νέο κωδικό.")
    router.push("/login")
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <MailCheck className="mx-auto mb-2 size-10 text-primary" />
          <CardTitle className="font-heading text-xl">Ελέγξτε το e-mail σας</CardTitle>
          <CardDescription>Αν υπάρχει λογαριασμός με αυτή τη διεύθυνση, θα λάβετε σύνδεσμο για νέο κωδικό.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">{mode === "request" ? "Ξεχάσατε τον κωδικό;" : "Νέος κωδικός"}</CardTitle>
        <CardDescription>{mode === "request" ? "Γράψτε το e-mail σας και θα σας στείλουμε σύνδεσμο για νέο κωδικό." : "Επιλέξτε νέο κωδικό (τουλάχιστον 8 χαρακτήρες)."}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {mode === "request" ? (
            <>
              <div className="grid gap-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
              <Turnstile onToken={setCaptcha} resetKey={resetKey} />
            </>
          ) : (
            <>
              <div className="grid gap-1.5"><Label htmlFor="password">Νέος κωδικός</Label><Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /></div>
              <div className="grid gap-1.5"><Label htmlFor="confirm">Επανάληψη</Label><Input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" /></div>
            </>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" size="lg" disabled={pending || (mode === "reset" && !token)}>
            {pending && <Loader2 className="animate-spin" />}{mode === "request" ? "Αποστολή συνδέσμου" : "Αποθήκευση κωδικού"}
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground underline">Πίσω στη σύνδεση</Link>
        </CardFooter>
      </form>
    </Card>
  )
}
