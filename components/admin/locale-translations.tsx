"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, PenLine, Search, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAdminT } from "@/components/i18n-provider"
import { reviewSuggestionAction, setLocaleTextAction, suggestTranslationAction } from "@/app/admin/i18n-actions"
import type { MessageKey } from "@/lib/i18n"
import type { ExtraLocale } from "@/lib/locales"
import type { Translatable } from "@/lib/translatable"
import { cn } from "@/lib/utils"

export type LocaleRow = Translatable & { draft: string; override: string }
export type Suggestion = { id: number; key: string; text: string; note: string; author: string | null; mine: boolean }

const GROUPS = ["public", "auth", "data"] as const
const fold = (s: string) => s.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

/**
 * The public texts in one extra language. Everyone signed in can suggest a fix; admins approve or reject
 * suggestions; superadmins can also edit directly.
 */
export function LocaleTranslations({ locale, rows, suggestions, role }: {
  locale: ExtraLocale; rows: LocaleRow[]; suggestions: Suggestion[]; role: "user" | "admin" | "superadmin"
}) {
  const t = useAdminT()
  const router = useRouter()
  const [group, setGroup] = useState<(typeof GROUPS)[number] | "all">("all")
  const [filter, setFilter] = useState<"all" | "missing" | "pending">(() => (role !== "user" && suggestions.some((s) => !s.mine) ? "pending" : "all"))
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(60)
  const [editing, setEditing] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()

  const byKey = useMemo(() => {
    const m = new Map<string, Suggestion[]>()
    for (const s of suggestions) m.set(s.key, [...(m.get(s.key) ?? []), s])
    return m
  }, [suggestions])
  const shown = useMemo(() => {
    const q = fold(query.trim())
    return rows.filter((r) => (group === "all" || r.group === group) &&
      (filter !== "missing" || !(r.override || r.draft)) && (filter !== "pending" || byKey.has(r.key)) &&
      (!q || [r.key, r.el, r.en, r.draft, r.override].some((s) => fold(s).includes(q))))
  }, [rows, group, filter, query, byKey])

  const done = (r: { ok: true } | { ok: false; error: string }, message: MessageKey) => {
    if (!r.ok) return void toast.error(r.error)
    toast.success(t(message))
    setEditing(null)
    router.refresh()
  }
  const open = (r: LocaleRow) => { setEditing(r.key); setText(r.override || r.draft); setNote("") }
  const send = (r: LocaleRow) => start(async () => {
    if (role === "superadmin") done(await setLocaleTextAction(r.key, locale, text), "admin.tr.savedOne")
    else done(await suggestTranslationAction(r.key, locale, text, note), "admin.tr.sent")
  })
  const review = (s: Suggestion, approve: boolean) => start(async () => {
    done(await reviewSuggestionAction(s.id, approve), approve ? "admin.tr.approved" : "admin.tr.rejected")
  })
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs hover:bg-muted", active && "border-primary bg-accent font-semibold")

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(60) }} placeholder={t("admin.translations.search")} className="pl-8" />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", ...GROUPS] as const).map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => { setGroup(g); setLimit(60) }} className={chip(group === g)}>
              {g === "all" ? t("admin.translations.all") : g === "data" ? t("admin.tr.group.data") : t(`admin.translations.group.${g}` as MessageKey)}
            </button>
          ))}
          <button type="button" aria-pressed={filter === "missing"} onClick={() => setFilter((f) => (f === "missing" ? "all" : "missing"))} className={chip(filter === "missing")}>
            {t("admin.tr.onlyMissing")}
          </button>
          {suggestions.length > 0 && (
            <button type="button" aria-pressed={filter === "pending"} onClick={() => setFilter((f) => (f === "pending" ? "all" : "pending"))} className={chip(filter === "pending")}>
              {t("admin.tr.onlyPending")} · {byKey.size}
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{t("admin.translations.count", { shown: shown.length, total: rows.length })}</span>
      </div>

      <div className="grid gap-2">
        {shown.slice(0, limit).map((r) => {
          const current = r.override || r.draft
          return (
            <div key={r.key} className={cn("grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", r.override && "border-gold/60")}>
              <div className="grid content-start gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground">{t("admin.tr.english")} <code className="font-normal">{r.key}</code></span>
                <p className="text-sm whitespace-pre-wrap">{r.en}</p>
              </div>
              <div className="grid content-start gap-1.5">
                {editing === r.key ? (
                  <>
                    <Textarea lang={locale} rows={Math.min(8, Math.max(2, Math.ceil(r.en.length / 60)))} value={text} onChange={(e) => setText(e.target.value)} className="text-sm" autoFocus />
                    {role !== "superadmin" && <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.tr.note")} className="h-8 text-xs" />}
                    <span className="flex gap-2">
                      <Button size="sm" onClick={() => send(r)} disabled={pending || !text.trim()}>
                        {pending && <Loader2 className="animate-spin" />}{t(role === "superadmin" ? "admin.tr.save" : "admin.tr.send")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t("admin.tr.cancel")}</Button>
                    </span>
                  </>
                ) : (
                  <>
                    <p lang={locale} className={cn("text-sm whitespace-pre-wrap", !current && "text-muted-foreground italic")}>
                      {current || t("admin.tr.missing")}
                      {r.override && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary not-italic">{t("admin.tr.fixed")}</span>}
                    </p>
                    <button type="button" onClick={() => open(r)} className="flex items-center gap-1 justify-self-start text-xs text-primary underline underline-offset-2">
                      <PenLine className="size-3" />{t(role === "superadmin" ? "admin.tr.edit" : "admin.tr.suggest")}
                    </button>
                  </>
                )}
                {byKey.get(r.key)?.map((s) => s.mine && role === "user" ? (
                  <p key={s.id} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{t("admin.tr.yourPending", { text: s.text })}</p>
                ) : role !== "user" && (
                  <div key={s.id} className="grid gap-1 rounded-md border border-gold/50 bg-accent/40 p-2 text-sm">
                    <span className="text-[11px] text-muted-foreground">{t("admin.tr.suggestion", { name: s.author ?? "?" })}</span>
                    <p lang={locale} className="whitespace-pre-wrap">{s.text}</p>
                    {s.note && <p className="text-xs text-muted-foreground italic">{s.note}</p>}
                    <span className="flex gap-2">
                      <Button size="sm" onClick={() => review(s, true)} disabled={pending}><Check />{t("admin.tr.approve")}</Button>
                      <Button size="sm" variant="outline" onClick={() => review(s, false)} disabled={pending}><X />{t("admin.tr.reject")}</Button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {shown.length > limit && (
          <Button variant="outline" className="justify-self-center" onClick={() => setLimit((n) => n + 60)}>
            {t("admin.translations.more", { n: shown.length - limit })}
          </Button>
        )}
      </div>
    </div>
  )
}
