import { OG_SIZE, shareCard } from "@/components/og/share-card"
import { TYPE_LABELS, type SiteType } from "@/lib/content"
import { getEdition } from "@/lib/editions-server"
import { getRegions } from "@/lib/regions-server"
import { publicSite } from "@/lib/sites"

export const size = OG_SIZE
export const contentType = "image/jpeg"
export const alt = "Οδοιπορικό"

// The preview shown when a church page is shared: its first photo with the Greek and English names.
export default async function Image({ params }: { params: Promise<{ edition: string; slug: string }> }) {
  const { edition: editionId, slug } = await params
  const [site, regions, edition] = await Promise.all([publicSite(slug), getRegions(), getEdition(editionId)])
  const SITE_NAME = edition?.title ?? { el: "Οδοιπορικό", en: "Odoiporiko" }
  if (!site?.published) return shareCard({ kicker: SITE_NAME.el, title: SITE_NAME.el, subtitle: SITE_NAME.en })
  const { el, en } = site.content
  const region = regions.find((r) => r.id === site.region)
  return shareCard({
    kicker: [TYPE_LABELS[site.type as SiteType]?.el, el.location.split(",")[0] || region?.name.el].filter(Boolean).join(" · "),
    title: el.name || en.name,
    subtitle: en.name && en.name !== el.name ? en.name : undefined,
    footer: `Οδοιπορικό · ${SITE_NAME.el}`,
    photo: site.photos[0]?.src,
  })
}
