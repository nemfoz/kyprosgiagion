import { OG_SIZE, shareCard } from "@/components/og/share-card"

export const size = OG_SIZE
export const contentType = "image/jpeg"
export const alt = "Οδοιπορικό · Odoiporiko"

// The preview for every page without its own (the home page, the map, name days, Metropolises…).
export default function Image() {
  return shareCard({
    kicker: "Εκκλησίες και μοναστήρια · Churches and monasteries",
    title: "Οδοιπορικό",
    subtitle: "Οδοιπορικό στις εκκλησίες και τα μοναστήρια της Ορθοδοξίας",
    footer: "Odoiporiko · A pilgrim's atlas of Orthodox churches",
  })
}
