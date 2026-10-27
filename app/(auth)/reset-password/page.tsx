import type { Metadata } from "next"
import { AuthHeader } from "@/components/auth/auth-form"
import { PasswordForms } from "@/components/auth/password-forms"
import { getT } from "@/lib/i18n-server"
import { authLang } from "../lang"

export async function generateMetadata({ searchParams }: PageProps<"/reset-password">): Promise<Metadata> {
  const [t, lang] = await Promise.all([getT(), authLang((await searchParams).lang)])
  return { title: t("auth.title.reset", lang) }
}

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error, lang: param } = await searchParams
  const lang = await authLang(param)
  return (
    <>
      <AuthHeader lang={lang} />
      <PasswordForms mode="reset" lang={lang} token={typeof token === "string" ? token : ""} error={typeof error === "string" ? error : ""} />
    </>
  )
}
