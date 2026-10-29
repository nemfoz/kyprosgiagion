"use client"

import { useState, useTransition } from "react"
import { CircleCheck, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Turnstile } from "@/components/auth/turnstile"
import { useT } from "@/components/i18n-provider"
import { sendContactAction } from "@/app/contact-actions"
import { HONEYPOT_FIELD } from "@/lib/antispam"
import type { MessageKey } from "@/lib/i18n"
import type { Locale } from "@/lib/locales"

const TOPICS = ["general", "correction", "photos", "edition", "press", "other"] as const

/** The contact form on /contact. Signed-in visitors get their name and e-mail filled in. */
export function ContactForm({ lang, user }: { lang: Locale; user: { name: string; email: string } | null }) {
  const t = useT()
  const [v, setV] = useState({ name: user?.name ?? "", email: user?.email ?? "", topic: "general", subject: "", body: "", [HONEYPOT_FIELD]: "" })
  const [startedAt] = useState(() => Date.now())
  const [token, setToken] = useState("")
  const [resetKey, setResetKey] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()
  const set = (k: keyof typeof v, val: string) => setV((x) => ({ ...x, [k]: val }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const r = await sendContactAction({ ...v, lang, startedAt, token })
      setResetKey((k) => k + 1)
      if (r.ok) { setSent(true); setErrors([]) }
      else setErrors(r.errors)
    })
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-accent/50 p-5" role="status">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="grid gap-1">
          <p className="font-semibold">{t("contactSent", lang)}</p>
          <p className="text-sm text-muted-foreground">{t("contactSentText", lang, { email: v.email })}</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-5 md:p-6" noValidate>
      <h2 className="font-heading text-xl font-bold">{t("contactFormTitle", lang)}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="c-name">{t("contactName", lang)}</Label>
          <Input id="c-name" autoComplete="name" required value={v.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-email">{t("contactEmailField", lang)}</Label>
          <Input id="c-email" type="email" autoComplete="email" required value={v.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>{t("contactTopic", lang)}</Label>
          <Select value={v.topic} onValueChange={(x) => set("topic", x)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{TOPICS.map((x) => <SelectItem key={x} value={x}>{t(`contactTopic.${x}` as MessageKey, lang)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-subject">{t("contactSubject", lang)}</Label>
          <Input id="c-subject" value={v.subject} onChange={(e) => set("subject", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-body">{t("contactMessage", lang)}</Label>
        <Textarea id="c-body" required rows={7} value={v.body} onChange={(e) => set("body", e.target.value)} />
      </div>
      {/* Hidden from people; bots fill it in. */}
      <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0"
        value={v[HONEYPOT_FIELD]} onChange={(e) => set(HONEYPOT_FIELD, e.target.value)} />
      <Turnstile onToken={setToken} resetKey={resetKey} />
      {errors.length > 0 && (
        <ul className="grid gap-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {errors.map((k) => <li key={k}>{t(k as MessageKey, lang)}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending} className="h-11">{pending ? <Loader2 className="animate-spin" /> : <Send />}{t("contactSend", lang)}</Button>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">{t("contactPrivacy", lang)}</p>
      </div>
    </form>
  )
}
