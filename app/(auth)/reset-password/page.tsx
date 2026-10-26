import type { Metadata } from "next"
import { PasswordForms } from "@/components/auth/password-forms"

export const metadata: Metadata = { title: "Νέος κωδικός" }

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams
  return <PasswordForms mode="reset" token={typeof token === "string" ? token : ""} error={typeof error === "string" ? error : ""} />
}
