// Smaller copies of every stored photo, saved next to the original as WebP:
//   /media/photos/name.jpg → /media/photos/name.sm.webp (list thumbnails) and name.md.webp (cards, gallery).
// Shared by the app (lib/storage.ts, components) and the scripts (scripts/lib.mjs, scripts/migrate.mjs).
// If a copy is missing, /media and /uploads serve the original instead.

/** @type {Record<"sm" | "md", number>} longest side in pixels */
export const PHOTO_SIZES = { sm: 320, md: 960 }

const STORED = /^(\/uploads\/|\/media\/photos\/|https:\/\/[^/]+\.blob\.vercel-storage\.com\/photos\/)/
const EXT = /\.(jpe?g|png|webp|gif)$/i

/**
 * The URL of a smaller copy of a stored photo; other URLs (and empty values) are returned unchanged.
 * @param {string | null | undefined} src
 * @param {"sm" | "md"} size
 */
export function sized(src, size) {
  if (!src || !STORED.test(src) || !EXT.test(src) || /\.(sm|md)\.webp$/.test(src)) return src ?? ""
  return src.replace(EXT, `.${size}.webp`)
}

/**
 * For a copy's file name, the base name its original starts with ("name.sm.webp" → "name"), else null.
 * @param {string} name
 */
export function originalBase(name) {
  const m = /^(.+)\.(sm|md)\.webp$/.exec(name)
  return m ? m[1] : null
}
