import namedays from "@/data/namedays.json"
import metropolises from "@/data/imports/metropolises.json"
import { BADGES, BONUSES, LEVEL_NAMES, SECTIONS } from "@/lib/completeness"
import { slugify, TYPE_LABELS } from "@/lib/content"
import { MESSAGE_GROUPS, type Message } from "@/lib/i18n"
import { regions, siteTitle } from "@/lib/regions"

export type Translatable = { key: string; group: "public" | "auth" | "data"; el: string; en: string }

/**
 * Every text the public pages show in the extra languages: the interface text (public and sign-in pages)
 * and labels kept as data (church types, regions, badges, feasts, the names of the sees…).
 */
export function translatableTexts(): Translatable[] {
  const out: Translatable[] = []
  const add = (group: Translatable["group"], key: string, m: { el: string; en: string }) => out.push({ key, group, el: m.el, en: m.en })
  for (const group of ["public", "auth"] as const) {
    for (const [key, m] of Object.entries(MESSAGE_GROUPS[group] as Record<string, Message>)) if (key !== "auth.switchLang") add(group, key, m)
  }
  add("data", "data.siteTitle", siteTitle)
  for (const r of regions) add("data", `data.region.${r.id}`, r.name)
  for (const [k, m] of Object.entries(TYPE_LABELS)) add("data", `data.type.${k}`, m)
  for (const s of SECTIONS) { add("data", `data.section.${s.key}`, s.label); add("data", `data.section.${s.key}.hint`, s.hint) }
  for (const [k, b] of Object.entries(BONUSES)) { add("data", `data.bonus.${k}`, b.label); add("data", `data.bonus.${k}.hint`, b.hint) }
  for (const [k, b] of Object.entries(BADGES)) { add("data", `data.badge.${k}`, b); add("data", `data.badge.${k}.hint`, b.hint) }
  LEVEL_NAMES.forEach((l, i) => add("data", `data.level.${i}`, l))
  for (const f of [...namedays.movable, ...namedays.movedAfterEaster]) add("data", `data.feast.${slugify(f.feast.en)}`, f.feast)
  for (const m of metropolises) add("data", `data.metropolis.${m.slug}`, { el: m.content.el.name, en: m.content.en.name })
  return out
}
