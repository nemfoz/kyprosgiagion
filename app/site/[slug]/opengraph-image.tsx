import { OG_SIZE, shareCard } from "@/components/og/share-card"
import { TYPE_LABELS, type SiteType } from "@/lib/content"
import { regions } from "@/lib/regions"
import { getSite } from "@/lib/sites"
import { siteTitle as SITE_NAME } from "@/lib/regions"

export const size = OG_SIZE
export const contentType = "image/jpeg"
export const alt = SITE_NAME.el

// The preview shown when a church page is shared: its first photo with the Greek and English names.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getSite({ slug: (await params).slug })
  if (!site?.published) return shareCard({ kicker: SITE_NAME.el, title: SITE_NAME.el, subtitle: SITE_NAME.en })
  const { el, en } = site.content
  const region = regions.find((r) => r.id === site.region)
  return shareCard({
    kicker: [TYPE_LABELS[site.type as SiteType]?.el, el.location.split(",")[0] || region?.name.el].filter(Boolean).join(" · "),
    title: el.name || en.name,
    subtitle: en.name && en.name !== el.name ? en.name : undefined,
    footer: `${SITE_NAME.el} · ${SITE_NAME.en}`,
    photo: site.photos[0]?.src,
  })
}
