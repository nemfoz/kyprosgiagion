"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { MISSIONS, missionLabel, SECTIONS, type MissionKey, type SectionKey } from "@/lib/completeness"
import type { Lang } from "@/lib/content"
import { useT } from "@/components/i18n-provider"
import { trData } from "@/lib/i18n"
import { localePath, tr, type Locale } from "@/lib/locales"
import { cn } from "@/lib/utils"
import { sized } from "@/lib/photo-sizes.mjs"

export type MissionSite = {
  id: number; slug: string; cover: string | null; percent: number; missing: MissionKey[]; missingPoints: number
  name: Record<Lang, string>; location: Record<Lang, string>
}

const sectionOf = (k: MissionKey) => k.split(".")[0] as SectionKey

/** Churches that need work, filterable by the section someone wants to contribute to. */
export function MissionList({ sites, lang, signedIn }: { sites: MissionSite[]; lang: Locale; signedIn: boolean }) {
  const t = useT()
  const [filter, setFilter] = useState<SectionKey | "all">("all")
  const [limit, setLimit] = useState(12)
  const open = sites.filter((s) => s.percent < 100)
  const needs = (s: MissionSite, k: SectionKey) => s.missing.some((m) => sectionOf(m) === k)
  const shown = useMemo(() => open.filter((s) => filter === "all" || needs(s, filter)), [open, filter])
  const count = (k: SectionKey) => open.filter((s) => needs(s, k)).length
  const href = (s: MissionSite) => (signedIn ? `/admin/sites/${s.id}` : `${localePath("/login", lang)}?next=${encodeURIComponent(`/admin/sites/${s.id}`)}`)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Chip active={filter === "all"} onClick={() => { setFilter("all"); setLimit(12) }}>{t("mAll", lang)} · {open.length}</Chip>
        {SECTIONS.filter((s) => count(s.key) > 0).map((s) => (
          <Chip key={s.key} active={filter === s.key} onClick={() => { setFilter(s.key); setLimit(12) }}>
            {trData(`data.section.${s.key}`, s.label, lang)} · {count(s.key)}
          </Chip>
        ))}
      </div>
      {shown.length === 0 && <p className="text-sm text-muted-foreground">{t("mAllDone", lang)}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.slice(0, limit).map((s) => (
          <li key={s.id}>
            <Link href={href(s)} className="group grid grid-cols-[64px_1fr_16px] items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm">
              {s.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sized(s.cover, "sm")} alt="" loading="lazy" className="h-16 w-16 rounded-t-[30px] rounded-b-lg object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-t-[30px] rounded-b-lg bg-muted text-2xl text-muted-foreground">✝</span>
              )}
              <span className="grid min-w-0 gap-1">
                <span className="line-clamp-2 font-heading leading-snug font-medium">{tr(s.name, lang)}</span>
                <span className="truncate text-xs text-muted-foreground">{tr(s.location, lang)}</span>
                <span className="flex items-center gap-2">
                  <ProgressBar percent={s.percent} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold text-gold-deep">{s.percent}%</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("mUpTo", lang)} <b className="text-primary">+{s.missingPoints}</b> {t("mPoints", lang)}
                  {" · "}{s.missing.slice(0, 3).map((k) => missionLabel(MISSIONS.find((m) => m.key === k)!, lang)).join(", ")}{s.missing.length > 3 ? "…" : ""}
                </span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      {shown.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + 12)} className="justify-self-center rounded-full border px-4 py-1.5 text-sm hover:bg-muted">
          {t("mMore", lang, { n: shown.length - limit })}
        </button>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("min-h-9 rounded-full border px-3.5 py-1 text-sm transition hover:bg-muted md:min-h-0 md:px-3 md:text-xs", active && "border-primary bg-accent font-semibold")}>
      {children}
    </button>
  )
}
