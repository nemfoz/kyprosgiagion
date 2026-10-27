"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw, Save, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAdminT } from "@/components/i18n-provider"
import { saveTranslationsAction } from "@/app/admin/i18n-actions"
import { MESSAGE_GROUPS, type Message, type MessageKey, type Overrides } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Group = keyof typeof MESSAGE_GROUPS
const GROUPS = Object.keys(MESSAGE_GROUPS) as Group[]
const ROWS = Object.entries(MESSAGE_GROUPS).flatMap(([group, messages]) =>
  Object.entries(messages as Record<string, Message>).map(([key, def]) => ({ key, group: group as Group, def })))
const fold = (s: string) => s.toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "")

// Every text as currently shown: the override if there is one, otherwise the default.
const current = (o: Overrides) => Object.fromEntries(ROWS.map((r) => [r.key, { el: o[r.key]?.el || r.def.el, en: o[r.key]?.en || r.def.en }])) as Record<string, Message>

/** Superadmin: every interface text with its Greek and English version; edited texts are highlighted. */
export function TranslationsEditor({ initial }: { initial: Overrides }) {
  const t = useAdminT()
  const router = useRouter()
  const start0 = useMemo(() => current(initial), [initial])
  const [values, setValues] = useState(start0)
  const [group, setGroup] = useState<Group | "all">("all")
  const [changedOnly, setChangedOnly] = useState(false)
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(60)
  const [pending, start] = useTransition()

  const defaults = useMemo(() => current({}), [])
  const isChanged = (key: string) => values[key].el !== defaults[key].el || values[key].en !== defaults[key].en
  const shown = useMemo(() => {
    const q = fold(query.trim())
    return ROWS.filter((r) => (group === "all" || r.group === group) && (!changedOnly || isChanged(r.key)) &&
      (!q || [r.key, r.def.el, r.def.en, values[r.key].el, values[r.key].en].some((s) => fold(s).includes(q))))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isChanged reads values
  }, [group, changedOnly, query, values])
  const dirty = JSON.stringify(values) !== JSON.stringify(start0)

  const set = (key: string, lang: "el" | "en", text: string) =>
    setValues((v) => ({ ...v, [key]: { ...v[key], [lang]: text } }))
  const reset = (key: string) => setValues((v) => ({ ...v, [key]: defaults[key] }))

  function save() {
    start(async () => {
      const r = await saveTranslationsAction(values)
      if (!r.ok) return void toast.error(r.error)
      toast.success(t("admin.translations.saved", { n: r.count }))
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(60) }} placeholder={t("admin.translations.search")} className="pl-8" />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", ...GROUPS] as const).map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => { setGroup(g); setLimit(60) }}
              className={cn("rounded-full border px-3 py-1 text-xs hover:bg-muted", group === g && "border-primary bg-accent font-semibold")}>
              {g === "all" ? t("admin.translations.all") : t(`admin.translations.group.${g}` as MessageKey)}
            </button>
          ))}
          <button type="button" aria-pressed={changedOnly} onClick={() => setChangedOnly((c) => !c)}
            className={cn("rounded-full border px-3 py-1 text-xs hover:bg-muted", changedOnly && "border-primary bg-accent font-semibold")}>
            {t("admin.translations.changedOnly")}
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{t("admin.translations.count", { shown: shown.length, total: ROWS.length })}</span>
      </div>

      <div className="grid gap-2">
        {shown.slice(0, limit).map((r) => (
          <div key={r.key} className={cn("grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-[200px_1fr_1fr]", isChanged(r.key) && "border-gold/60")}>
            <div className="grid content-start gap-1">
              <code className="text-xs break-all text-muted-foreground">{r.key}</code>
              {isChanged(r.key) && (
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary">{t("admin.translations.changed")}</span>
                  <button type="button" onClick={() => reset(r.key)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <RotateCcw className="size-3" />{t("admin.translations.reset")}
                  </button>
                </span>
              )}
            </div>
            {(["el", "en"] as const).map((lang) => (
              <label key={lang} className="grid gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground">{lang === "el" ? "Ελληνικά" : "English"}</span>
                <Textarea rows={r.def[lang].length > 70 ? 3 : 1} value={values[r.key][lang]} title={r.def[lang]}
                  onChange={(e) => set(r.key, lang, e.target.value)} className={cn("min-h-9 py-1.5 text-sm", values[r.key][lang] !== r.def[lang] && "border-gold bg-accent/40")} />
              </label>
            ))}
          </div>
        ))}
        {shown.length > limit && (
          <Button variant="outline" className="justify-self-center" onClick={() => setLimit((n) => n + 60)}>
            {t("admin.translations.more", { n: shown.length - limit })}
          </Button>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button onClick={save} disabled={!dirty || pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{t("admin.translations.save")}</Button>
      </div>
    </div>
  )
}
