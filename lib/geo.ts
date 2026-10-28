import { intlLocale, type Locale } from "@/lib/locales"

/** Distance in km between two points (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

/** "850 m", "3.8 km", "24 km" in the reader's language. */
export function formatDistance(km: number, lang: Locale) {
  const locale = intlLocale(lang)
  return km < 1
    ? new Intl.NumberFormat(locale, { style: "unit", unit: "meter", maximumFractionDigits: 0 }).format(Math.round(km * 100) * 10)
    : new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer", maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)
}

/** Google Maps directions from wherever the phone is to a point. */
export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}`
