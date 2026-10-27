"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/auth/turnstile"
import { authClient } from "@/lib/auth-client"
import { HONEYPOT_FIELD } from "@/lib/antispam"

export const AUTH_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Λάθος e-mail ή κωδικός.",
  USER_ALREADY_EXISTS: "Υπάρχει ήδη λογαριασμός με αυτό το e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Υπάρχει ήδη λογαριασμός με αυτό το e-mail.",
  PASSWORD_TOO_SHORT: "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.",
  BANNED_USER: "Ο λογαριασμός σας έχει απενεργοποιηθεί.",
  EMAIL_NOT_VERIFIED: "Επιβεβαιώστε πρώτα το e-mail σας. Σας στείλαμε ξανά τον σύνδεσμο επιβεβαίωσης.",
  MISSING_RESPONSE: "Ολοκληρώστε τον έλεγχο ασφαλείας και δοκιμάστε ξανά.",
  VERIFICATION_FAILED: "Ο έλεγχος ασφαλείας απέτυχε. Δοκιμάστε ξανά.",
  INVALID_TOKEN: "Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.",
}
export const authMessage = (e: { code?: string; message?: string; status?: number }) =>
  e.status === 429 ? "Πάρα πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά." : AUTH_MESSAGES[e.code ?? ""] ?? e.message ?? "Κάτι πήγε στραβά."

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
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
    if (TURNSTILE_SITE_KEY && !captcha) return setError(AUTH_MESSAGES.MISSING_RESPONSE)
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
    const { data, error } = signup
      ? await authClient.signUp.email({ email, password, name: String(f.get("name")).trim(), callbackURL: "/verified" }, { headers })
      : await authClient.signIn.email({ email, password, callbackURL: "/verified" }, { headers })
    setResetKey((k) => k + 1)
    if (error) { setPending(false); return setError(authMessage(error)) }
    if (signup && !data?.user.emailVerified) { setPending(false); return setSentTo(email) }
    // Already confirmed (the first superadmin): sign straight in.
    if (signup) {
      const r = await authClient.signIn.email({ email, password })
      if (r.error) { setPending(false); return setError(authMessage(r.error)) }
    }
    setPending(false)
    router.push(next)
    router.refresh()
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader className="text-center">
          <MailCheck className="mx-auto mb-2 size-10 text-primary" />
          <CardTitle className="font-heading text-xl">Ελέγξτε το e-mail σας</CardTitle>
          <CardDescription>
            Στείλαμε σύνδεσμο επιβεβαίωσης στο <b className="text-foreground">{sentTo}</b>. Πατήστε τον για να ενεργοποιηθεί ο λογαριασμός σας.
            Αν δεν το βλέπετε, κοιτάξτε και στα ανεπιθύμητα.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="link" asChild><Link href="/login">Μετάβαση στη σύνδεση</Link></Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">{signup ? "Δημιουργία λογαριασμού" : "Σύνδεση"}</CardTitle>
        <CardDescription>
          {signup
            ? "Με λογαριασμό μπορείτε να προτείνετε νέες εκκλησίες ή διορθώσεις. Θα σας στείλουμε e-mail για να επιβεβαιώσετε τη διεύθυνσή σας."
            : "Για συνεργάτες και διαχειριστές του χάρτη."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {signup && (
            <div className="grid gap-1.5">
              <Label htmlFor="name">Ονοματεπώνυμο</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Κωδικός</Label>
              {!signup && <Link href="/forgot-password" className="text-xs text-muted-foreground underline">Ξεχάσατε τον κωδικό;</Link>}
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
            {pending && <Loader2 className="animate-spin" />}{signup ? "Εγγραφή" : "Είσοδος"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {signup ? <>Έχετε ήδη λογαριασμό; <Link href="/login" className="text-primary underline">Σύνδεση</Link></>
              : <>Δεν έχετε λογαριασμό; <Link href="/signup" className="text-primary underline">Εγγραφή</Link></>}
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
