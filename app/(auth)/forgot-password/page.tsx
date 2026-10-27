import type { Metadata } from "next"
import { AuthHeader } from "@/components/auth/auth-form"
import { PasswordForms } from "@/components/auth/password-forms"
import { getT } from "@/lib/i18n-server"
import { authLang } from "../lang"

export async function generateMetadata({ searchParams }: PageProps<"/forgot-password">): Promise<Metadata> {
  const [t, lang] = await Promise.all([getT(), authLang((await searchParams).lang)])
  return { title: t("auth.title.forgot", lang) }
}

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const lang = await authLang((await searchParams).lang)
  return (
    <>
      <AuthHeader lang={lang} />
      <PasswordForms mode="request" lang={lang} />
    </>
  )
}
