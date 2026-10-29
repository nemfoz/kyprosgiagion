// Runs the built-in parish importers (lib/parish-sources) against the live Metropolis websites and prints
// counts, coordinates/photos coverage and a few sample rows. Nothing is written anywhere.
// Usage: node scripts/test-parish-sources.mts [source-id …] [--json out.json] [--all]
//   --all   print every row (one line each) instead of samples
// Node ≥ 23 runs TypeScript directly (type stripping); the hook below resolves "@/…" and extensionless imports.
import { registerHooks } from "node:module"
import { existsSync, writeFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
registerHooks({
  resolve(specifier, context, next) {
    let spec = specifier
    if (spec.startsWith("@/")) spec = pathToFileURL(root + spec.slice(2)).href
    if ((spec.startsWith("file:") || spec.startsWith(".")) && !/\.[cm]?[jt]sx?$|\.json$/.test(spec)) {
      const base = new URL(spec, context.parentURL)
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        const candidate = new URL(base.href + ext)
        if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context)
      }
    }
    return next(spec, context)
  },
})

const { PARISH_SOURCES } = (await import(new URL("../lib/parish-sources/index.ts", import.meta.url).href)) as typeof import("../lib/parish-sources/index")

const args = process.argv.slice(2)
const jsonAt = args.indexOf("--json")
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : undefined
const all = args.includes("--all")
const ids = args.filter((a, i) => !a.startsWith("--") && (jsonAt < 0 || i !== jsonAt + 1))
const sources = ids.length ? PARISH_SOURCES.filter((s) => ids.includes(s.id)) : PARISH_SOURCES
if (!sources.length) {
  console.error(`Unknown source. Available: ${PARISH_SOURCES.map((s) => s.id).join(", ")}`)
  process.exit(1)
}

const results: Record<string, unknown> = {}
for (const src of sources) {
  console.log(`\n=== ${src.id} — ${src.label.en}\n    ${src.url}`)
  const t0 = Date.now()
  try {
    const rows = await src.fetch({ log: (m) => console.log(`    · ${m}`) })
    const secs = ((Date.now() - t0) / 1000).toFixed(1)
    const count = (f: (r: (typeof rows)[number]) => unknown) => rows.filter(f).length
    const byType = Object.entries(Object.groupBy(rows, (r) => r.type ?? "?")).map(([k, v]) => `${k} ${v?.length}`).join(", ")
    const bySee = Object.entries(Object.groupBy(rows, (r) => r.see ?? src.see)).map(([k, v]) => `${k} ${v?.length}`).join(", ")
    const byRegion = Object.entries(Object.groupBy(rows, (r) => r.region ?? `(${src.region ?? "–"})`)).map(([k, v]) => `${k} ${v?.length}`).join(", ")
    console.log(`    ${rows.length} rows in ${secs}s — ${byType}`)
    console.log(`    sees: ${bySee} · regions: ${byRegion}`)
    console.log(`    coordinates: ${count((r) => r.lat != null)} (exact ${count((r) => r.lat != null && r.coords !== "approximate")}) · photos: ${count((r) => r.image)} · place: ${count((r) => r.location_el)} · English name: ${count((r) => r.name_en)}`)
    const bad = rows.filter((r) => /\d{8}|τηλ[.:]|@|Εφημέρ|Επίτροπ|Ψάλτ|Οικον\.|Πρεσβ\./i.test(JSON.stringify({ ...r, map_url: undefined, image: undefined, source: undefined })))
    if (bad.length) console.log(`    ⚠ ${bad.length} rows look like they contain personal details:`, bad.slice(0, 3))
    const show = all ? rows : [...rows.slice(0, 4), ...rows.slice(-2)]
    for (const r of show)
      console.log(`      ${r.type?.padEnd(9) ?? ""} ${r.name_el} | ${r.location_el ?? "–"}${r.location_en ? ` (${r.location_en})` : ""} | ${r.lat != null ? `${r.lat},${r.lng} ${r.coords ?? ""}` : "no pin"} | ${r.image ? "photo" : "no photo"} | ${r.see ?? ""}/${r.region ?? ""}`)
    results[src.id] = rows
  } catch (e) {
    console.log(`    ✗ failed after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${(e as Error).message}`)
  }
}
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(results, null, 2))
  console.log(`\nWrote ${jsonOut}`)
}
