import type { Metadata } from "next"
import Link from "next/link"
import { CircleCheck, CircleX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthHeader, withLang } from "@/components/auth/auth-form"
import { getT } from "@/lib/i18n-server"
import { getSession } from "@/lib/session"
import { authLang } from "../lang"

export async function generateMetadata({ searchParams }: PageProps<"/verified">): Promise<Metadata> {
  const [t, lang] = await Promise.all([getT(), authLang((await searchParams).lang)])
  return { title: t("auth.title.verified", lang) }
}

// Where the e-mail confirmation link lands (Better Auth redirects here, with ?error=… on failure).
export default async function VerifiedPage({ searchParams }: PageProps<"/verified">) {
  const { error, lang: param } = await searchParams
  const [session, t, lang] = await Promise.all([getSession(), getT(), authLang(param)])
  const ok = !error && session?.user.emailVerified

  return (
    <>
      <AuthHeader lang={lang} />
      <Card>
        <CardHeader className="text-center">
          {ok ? <CircleCheck className="mx-auto mb-2 size-10 text-primary" /> : <CircleX className="mx-auto mb-2 size-10 text-destructive" />}
          <CardTitle className="font-heading text-xl">{t(ok ? "auth.verified.ok" : "auth.verified.fail", lang)}</CardTitle>
          <CardDescription>{t(ok ? "auth.verified.okText" : "auth.verified.failText", lang)}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild><Link href={ok ? "/admin" : withLang("/login", lang)}>{t(ok ? "auth.verified.continue" : "auth.loginLink", lang)}</Link></Button>
        </CardFooter>
      </Card>
    </>
  )
}
