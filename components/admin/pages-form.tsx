"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { saveSiteInfoAction } from "@/app/admin/actions"
import { useAdminT, useT } from "@/components/i18n-provider"
import { INFO_PAGES, PAGE_TITLE_KEY, type InfoPage, type SiteInfo } from "@/lib/pages"
import { localePath } from "@/lib/locales"
import type { Lang } from "@/lib/content"

/** Superadmin editor for the information pages and the footer details (lib/pages.ts). */
export function PagesForm({ initial, defaults }: { initial: SiteInfo; defaults: Record<InfoPage, Record<Lang, string>> }) {
  const t = useAdminT()
  const tp = useT()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [email, setEmail] = useState(initial.contactEmail)
  const [url, setUrl] = useState(initial.foundationUrl)
  const [texts, setTexts] = useState(() => Object.fromEntries(INFO_PAGES.map((p) => [p, {
    el: initial.pages[p]?.el || defaults[p].el, en: initial.pages[p]?.en || defaults[p].en,
  }])) as Record<InfoPage, Record<Lang, string>>)
  const set = (p: InfoPage, l: Lang, v: string) => setTexts((x) => ({ ...x, [p]: { ...x[p], [l]: v } }))

  function save() {
    start(async () => {
      const r = await saveSiteInfoAction({ contactEmail: email, foundationUrl: url, pages: texts })
      if (!r.ok) return void toast.error(r.error)
      toast.success(t("admin.pages.saved"))
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">{t("admin.pages.details")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="info-email">{t("admin.pages.email")}</Label>
            <Input id="info-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="info-url">{t("admin.pages.foundationUrl")}</Label>
            <Input id="info-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("admin.pages.foundationHint")}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="about">
        <TabsList className="flex-wrap">
          {INFO_PAGES.map((p) => <TabsTrigger key={p} value={p}>{tp(PAGE_TITLE_KEY[p], t.lang)}</TabsTrigger>)}
        </TabsList>
        {INFO_PAGES.map((p) => (
          <TabsContent key={p} value={p} className="grid gap-4 lg:grid-cols-2">
            {(["el", "en"] as const).map((l) => (
              <Card key={l} className="gap-3">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="font-heading text-base">{l === "el" ? "Ελληνικά" : "English"}</CardTitle>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild><Link href={localePath(`/${p}`, l)} target="_blank">{t("admin.pages.view")}<ExternalLink /></Link></Button>
                    <Button variant="ghost" size="sm" disabled={texts[p][l] === defaults[p][l]} onClick={() => set(p, l, defaults[p][l])}><RotateCcw />{t("admin.pages.reset")}</Button>
                  </span>
                </CardHeader>
                <CardContent>
                  <Textarea value={texts[p][l]} onChange={(e) => set(p, l, e.target.value)} className="min-h-[420px] font-mono text-xs leading-relaxed" />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Button onClick={save} disabled={pending} className="justify-self-start">
        {pending ? <Loader2 className="animate-spin" /> : <Save />}{t("editor.save")}
      </Button>
    </div>
  )
}
