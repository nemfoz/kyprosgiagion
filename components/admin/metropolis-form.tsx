"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, RefreshCw, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAdminT } from "@/components/i18n-provider"
import { deleteMetropolisAction, refreshNewsAction, saveMetropolisAction } from "@/app/admin/metropolis-actions"
import type { MessageKey } from "@/lib/i18n"
import type { MetroContent } from "@/lib/metropolises"

type Values = { slug: string; sort: number; website: string; feedUrl: string; logo: string; content: MetroContent }
const TEXT = [
  { key: "name", label: "metro.field.name" },
  { key: "seat", label: "metro.field.seat" },
  { key: "summary", label: "metro.field.summary", rows: 3 },
  { key: "history", label: "metro.field.history", rows: 16, help: "metro.field.historyHelp" },
] as const

/** Admin editor for one Metropolis: bilingual texts, website, news feed and logo. */
export function MetropolisForm({ id, initial, churches, news }: {
  id: number | null; initial: Values
  churches: { id: number; name: string }[]; news: { id: number; title: string; url: string; date: string | null }[]
}) {
  const t = useAdminT()
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [pending, start] = useTransition()
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }))
  const setText = (lang: "el" | "en", key: keyof MetroContent["el"], val: string) =>
    setV((s) => ({ ...s, content: { ...s.content, [lang]: { ...s.content[lang], [key]: val } } }))
  const dateFmt = new Intl.DateTimeFormat(t.lang === "el" ? "el-GR" : "en-GB", { dateStyle: "medium", timeZone: "Asia/Nicosia" })

  function save(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const r = await saveMetropolisAction(id, v)
      if (!r.ok) return void toast.error(r.error)
      toast.success(t("metro.saved"))
      setV((s) => ({ ...s, logo: r.logo }))
      if (!id) router.push(`/admin/metropolises/${r.id}`)
      else router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardContent>
          <Tabs defaultValue={t.lang}>
            <TabsList><TabsTrigger value="el">Ελληνικά</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList>
            {(["el", "en"] as const).map((lang) => (
              <TabsContent key={lang} value={lang} className="mt-4 grid gap-4">
                {TEXT.map((f) => (
                  <div key={f.key} className="grid gap-1.5">
                    <Label htmlFor={`${lang}-${f.key}`}>{t(f.label)}</Label>
                    {"rows" in f ? (
                      <Textarea id={`${lang}-${f.key}`} rows={f.rows} value={v.content[lang][f.key]} onChange={(e) => setText(lang, f.key, e.target.value)}
                        className={f.key === "history" ? "max-h-[60vh] min-h-64 overflow-y-auto leading-relaxed" : ""} />
                    ) : (
                      <Input id={`${lang}-${f.key}`} value={v.content[lang][f.key]} onChange={(e) => setText(lang, f.key, e.target.value)} />
                    )}
                    {"help" in f && <p className="text-xs text-muted-foreground">{t(f.help as MessageKey)}</p>}
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid content-start gap-6">
        <Card>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <div className="grid gap-1.5"><Label htmlFor="slug">{t("metro.field.slug")}</Label><Input id="slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="sort">{t("metro.field.sort")}</Label><Input id="sort" type="number" value={v.sort} onChange={(e) => set("sort", Number(e.target.value))} /></div>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="website">{t("metro.field.website")}</Label><Input id="website" value={v.website} placeholder="https://…" onChange={(e) => set("website", e.target.value)} /></div>
            <div className="grid gap-1.5">
              <Label htmlFor="feed">{t("metro.field.feed")}</Label>
              <Input id="feed" value={v.feedUrl} placeholder="https://…/feed/" onChange={(e) => set("feedUrl", e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("metro.field.feedHelp")}</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="logo">{t("metro.field.logo")}</Label>
              <div className="flex items-center gap-3">
                {v.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.logo} alt="" className="size-12 shrink-0 rounded border bg-background object-contain" />
                )}
                <Input id="logo" value={v.logo} placeholder="https://…" onChange={(e) => set("logo", e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">{t("metro.field.logoHelp")}</p>
            </div>
          </CardContent>
        </Card>

        {id && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">{t("metro.latest")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ul className="grid gap-2 text-sm">
                {news.slice(0, 5).map((n) => (
                  <li key={n.id} className="grid">
                    {n.date && <span className="text-xs text-muted-foreground">{dateFmt.format(new Date(n.date))}</span>}
                    <a href={n.url} target="_blank" rel="noopener" className="leading-snug hover:text-primary hover:underline">{n.title}</a>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" disabled={pending || !initial.feedUrl} onClick={() => start(async () => {
                const r = await refreshNewsAction(id)
                if (!r.ok) return void toast.error(r.error)
                toast.success(t("metro.refreshed", { n: r.count }))
                router.refresh()
              })}><RefreshCw />{t("metro.refresh")}</Button>
            </CardContent>
          </Card>
        )}

        {id && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">{t("metro.col.churches")} ({churches.length})</CardTitle>
              <CardDescription>{t("metro.churchesHelp")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid max-h-72 gap-1 overflow-y-auto text-sm">
                {churches.map((c) => <li key={c.id}><Link href={`/admin/sites/${c.id}`} className="hover:text-primary hover:underline">{c.name}</Link></li>)}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{t("metro.save")}</Button>
        {id && v.slug && (
          <Button type="button" variant="outline" asChild className="ml-auto">
            <Link href={`/metropolis/${initial.slug}`} target="_blank">{t("metro.view")}<ExternalLink /></Link>
          </Button>
        )}
        {id && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="destructive"><Trash2 />{t("metro.delete")}</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("metro.delete")}</AlertDialogTitle>
                <AlertDialogDescription>{t("metro.deleteConfirm")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => start(async () => {
                  const r = await deleteMetropolisAction(id)
                  if (!r.ok) return void toast.error(r.error)
                  router.push("/admin/metropolises")
                })}>{t("metro.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  )
}
