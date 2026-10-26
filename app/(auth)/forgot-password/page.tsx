import type { Metadata } from "next"
import { PasswordForms } from "@/components/auth/password-forms"

export const metadata: Metadata = { title: "Επαναφορά κωδικού" }

export default function ForgotPasswordPage() {
  return <PasswordForms mode="request" />
}
