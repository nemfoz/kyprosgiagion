"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Mail, MailOpen, Reply, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAdminT, useT } from "@/components/i18n-provider"
import { deleteMessageAction, setMessageStatusAction } from "@/app/admin/message-actions"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Status = "new" | "read" | "done"
type Message = { id: number; name: string; email: string; topic: string; subject: string; body: string; lang: string; status: Status; createdAt: string; emailed: boolean }

/** The contact inbox: open a message (marks it read), reply by e-mail, mark it done, delete it. */
export function MessagesInbox({ messages }: { messages: Message[] }) {
  const t = useAdminT()
  const tp = useT()
  const router = useRouter()
  const [filter, setFilter] = useState<Status | "open">("open")
  const [openId, setOpenId] = useState<number | null>(null)
  const [pending, start] = useTransition()
  const when = new Intl.DateTimeFormat(t.lang === "el" ? "el-GR" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Nicosia" })
  const list = messages.filter((m) => (filter === "open" ? m.status !== "done" : m.status === filter))
  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh() })
  const open = (m: Message) => {
    setOpenId(openId === m.id ? null : m.id)
    if (m.status === "new") act(() => setMessageStatusAction(m.id, "read"))
  }
  const counts = { open: messages.filter((m) => m.status !== "done").length, new: messages.filter((m) => m.status === "new").length, done: messages.filter((m) => m.status === "done").length }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1">
        {(["open", "new", "done"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)}>{t(`msg.filter.${f}` as MessageKey)} <span className="text-muted-foreground">{counts[f]}</span></Button>
        ))}
      </div>
      {list.length === 0 && <p className="text-muted-foreground">{t("msg.empty")}</p>}
      <ul className="grid gap-2">
        {list.map((m) => (
          <li key={m.id} className={cn("rounded-xl border bg-card", m.status === "new" && "border-primary/40")}>
            <button type="button" onClick={() => open(m)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left">
              {m.status === "new" ? <Mail className="size-4 text-primary" /> : m.status === "done" ? <Check className="size-4 text-muted-foreground" /> : <MailOpen className="size-4 text-muted-foreground" />}
              <span className={cn("min-w-0 flex-1 truncate", m.status === "new" && "font-semibold")}>{m.subject || m.body.slice(0, 80)}</span>
              <Badge variant="secondary">{tp(`contactTopic.${m.topic}` as MessageKey, t.lang)}</Badge>
              <span className="text-xs text-muted-foreground">{m.name} · {when.format(new Date(`${m.createdAt.replace(" ", "T")}Z`))}</span>
            </button>
            {openId === m.id && (
              <div className="grid gap-3 border-t p-4">
                <p className="text-sm"><b>{m.name}</b> &lt;<a href={`mailto:${m.email}`} className="text-primary">{m.email}</a>&gt; · {m.lang.toUpperCase()}{m.emailed && <span className="text-muted-foreground"> · {t("msg.emailed")}</span>}</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm"><a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Οδοιπορικό"}`)}`}><Reply />{t("msg.reply")}</a></Button>
                  {m.status !== "done"
                    ? <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setMessageStatusAction(m.id, "done"))}><Check />{t("msg.markDone")}</Button>
                    : <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setMessageStatusAction(m.id, "read"))}><MailOpen />{t("msg.reopen")}</Button>}
                  <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={pending}
                    onClick={() => { if (confirm(t("msg.confirmDelete"))) act(() => deleteMessageAction(m.id)) }}><Trash2 />{t("msg.delete")}</Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
