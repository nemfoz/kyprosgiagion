import type { Metadata } from "next"
import { AuthForm, AuthHeader } from "@/components/auth/auth-form"
import { getT } from "@/lib/i18n-server"
import { authLang } from "../lang"

export async function generateMetadata({ searchParams }: PageProps<"/login">): Promise<Metadata> {
  const [t, lang] = await Promise.all([getT(), authLang((await searchParams).lang)])
  return { title: t("auth.title.login", lang) }
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, lang: param } = await searchParams
  const lang = await authLang(param)
  return (
    <>
      <AuthHeader lang={lang} />
      <AuthForm mode="login" lang={lang} next={typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/admin"} />
    </>
  )
}
