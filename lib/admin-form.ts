import { normaliseContent, type SiteType } from "@/lib/content"
import { regions } from "@/lib/regions"
import type { SiteWithPhotos } from "@/lib/sites"
import type { SiteFormValues } from "@/components/admin/site-form"

export const regionOptions = regions.map((r) => ({ id: r.id, name: r.name.el, active: r.active }))

export const emptySite = (): SiteFormValues => ({
  slug: "", type: "church", region: "karpasia", lat: null, lng: null,
  published: false, coordsVerified: false, content: normaliseContent({}),
})

export const toFormValues = (s: SiteWithPhotos): SiteFormValues => ({
  slug: s.slug, type: s.type as SiteType, region: s.region, lat: s.lat, lng: s.lng,
  published: s.published, coordsVerified: s.coordsVerified, content: s.content,
})

export const toFormPhotos = (s: SiteWithPhotos) =>
  s.photos.map((p) => ({ id: p.id, src: p.src, captionEl: p.captionEl, captionEn: p.captionEn, credit: p.credit, sourceUrl: p.sourceUrl }))
