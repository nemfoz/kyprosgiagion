"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authClient } from "@/lib/auth-client"

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Λάθος e-mail ή κωδικός.",
  USER_ALREADY_EXISTS: "Υπάρχει ήδη λογαριασμός με αυτό το e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Υπάρχει ήδη λογαριασμός με αυτό το e-mail.",
  PASSWORD_TOO_SHORT: "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.",
  BANNED_USER: "Ο λογαριασμός σας έχει απενεργοποιηθεί.",
}

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const signup = mode === "signup"

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setPending(true)
    const f = new FormData(e.currentTarget)
    const email = String(f.get("email"))
    const password = String(f.get("password"))
    const { error } = signup
      ? await authClient.signUp.email({ email, password, name: String(f.get("name")) })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (error) return setError(MESSAGES[error.code ?? ""] ?? error.message ?? "Κάτι πήγε στραβά.")
    router.push(next)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">{signup ? "Δημιουργία λογαριασμού" : "Σύνδεση"}</CardTitle>
        <CardDescription>
          {signup
            ? "Με λογαριασμό μπορείτε να προτείνετε νέες εκκλησίες ή διορθώσεις. Ο λογαριασμός ενεργοποιείται αφού τον εγκρίνει διαχειριστής."
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
            <Label htmlFor="password">Κωδικός</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} />
          </div>
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
