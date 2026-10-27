import { OG_SIZE, shareCard } from "@/components/og/share-card"
import { SITE_NAME } from "@/lib/seo"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = SITE_NAME.el

// The preview for every page without its own (the map, name days, Metropolises…).
export default function Image() {
  return shareCard({
    kicker: "Εκκλησίες και μοναστήρια · Churches and monasteries",
    title: SITE_NAME.el,
    subtitle: "Ο χάρτης των εκκλησιών της Καρπασίας και της Αμμοχώστου",
    footer: SITE_NAME.en,
  })
}
