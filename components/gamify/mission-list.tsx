"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { MISSIONS, type MissionKey } from "@/lib/completeness"
import type { Lang } from "@/lib/content"
import { cn } from "@/lib/utils"

export type MissionSite = {
  id: number; slug: string; cover: string | null; percent: number; missing: MissionKey[]; missingPoints: number
  name: Record<Lang, string>; location: Record<Lang, string>
}

/** Churches that need work, filterable by the kind of contribution someone wants to make. */
export function MissionList({ sites, lang, signedIn }: { sites: MissionSite[]; lang: Lang; signedIn: boolean }) {
  const [filter, setFilter] = useState<MissionKey | "all">("all")
  const [limit, setLimit] = useState(12)
  const open = sites.filter((s) => s.percent < 100)
  const shown = useMemo(() => open.filter((s) => filter === "all" || s.missing.includes(filter)), [open, filter])
  const count = (k: MissionKey) => open.filter((s) => s.missing.includes(k)).length
  const href = (s: MissionSite) => (signedIn ? `/admin/sites/${s.id}` : `/site/${s.slug}${lang === "en" ? "?lang=en" : ""}#contribute`)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Chip active={filter === "all"} onClick={() => { setFilter("all"); setLimit(12) }}>{lang === "el" ? "Όλες" : "All"} · {open.length}</Chip>
        {MISSIONS.filter((m) => count(m.key) > 0).map((m) => (
          <Chip key={m.key} active={filter === m.key} onClick={() => { setFilter(m.key); setLimit(12) }}>
            {m.label[lang]} · {count(m.key)} <span className="text-primary">+{m.points}</span>
          </Chip>
        ))}
      </div>
      {shown.length === 0 && <p className="text-sm text-muted-foreground">{lang === "el" ? "Όλα συμπληρωμένα εδώ!" : "All done here!"}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.slice(0, limit).map((s) => (
          <li key={s.id}>
            <Link href={href(s)} className="group grid grid-cols-[64px_1fr_16px] items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm">
              {s.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.cover} alt="" loading="lazy" className="h-16 w-16 rounded-t-[30px] rounded-b-lg object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-t-[30px] rounded-b-lg bg-muted text-2xl text-muted-foreground">✝</span>
              )}
              <span className="grid min-w-0 gap-1">
                <span className="truncate font-heading font-medium">{s.name[lang] || s.name.el}</span>
                <span className="truncate text-xs text-muted-foreground">{s.location[lang] || s.location.el}</span>
                <span className="flex items-center gap-2">
                  <ProgressBar percent={s.percent} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold text-gold-deep">{s.percent}%</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {lang === "el" ? "Έως" : "Up to"} <b className="text-primary">+{s.missingPoints}</b> {lang === "el" ? "πόντοι" : "points"}
                  {" · "}{s.missing.slice(0, 3).map((k) => MISSIONS.find((m) => m.key === k)!.label[lang]).join(", ")}{s.missing.length > 3 ? "…" : ""}
                </span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      {shown.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + 12)} className="justify-self-center rounded-full border px-4 py-1.5 text-sm hover:bg-muted">
          {lang === "el" ? `Περισσότερες (${shown.length - limit})` : `More (${shown.length - limit})`}
        </button>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("rounded-full border px-3 py-1 text-xs transition hover:bg-muted", active && "border-primary bg-accent font-semibold")}>
      {children}
    </button>
  )
}
