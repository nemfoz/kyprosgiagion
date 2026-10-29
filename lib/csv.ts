// A small CSV/TSV reader for the bulk import: quoted fields, "" escapes, line breaks inside quotes; the separator
// (tab, semicolon or comma) is guessed from the first line. Spreadsheets copied from Excel/Sheets paste as TSV.
export function parseTable(text: string): string[][] {
  const src = text.replace(/^﻿/, "")
  const first = src.slice(0, src.indexOf("\n") >= 0 ? src.indexOf("\n") : undefined)
  const sep = ["\t", ";", ","].map((c) => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = [], field = "", quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === "") quoted = true
    else if (c === sep) { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

/** A CSV line with the values quoted where needed. */
export const csvLine = (values: string[]) => values.map((v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")
