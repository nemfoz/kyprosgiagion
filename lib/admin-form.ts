import { normaliseContent, type SiteType } from "@/lib/content"
import type { SiteWithPhotos } from "@/lib/sites"
import type { SiteFormValues } from "@/components/admin/site-form"

export const emptySite = (): SiteFormValues => ({
  slug: "", type: "church", region: "karpasia", lat: null, lng: null,
  published: false, coordsVerified: false, content: normaliseContent({}), metropolisId: null,
})

export const toFormValues = (s: SiteWithPhotos): SiteFormValues => ({
  slug: s.slug, type: s.type as SiteType, region: s.region, lat: s.lat, lng: s.lng,
  published: s.published, coordsVerified: s.coordsVerified, content: s.content, metropolisId: s.metropolisId,
})

export const toFormPhotos = (s: SiteWithPhotos) =>
  s.photos.map((p) => ({ id: p.id, src: p.src, captionEl: p.captionEl, captionEn: p.captionEn, credit: p.credit, sourceUrl: p.sourceUrl, historic: p.historic }))

export const toFormVideos = (s: SiteWithPhotos) =>
  s.videos.map((v) => ({ id: v.id, youtubeId: v.youtubeId, titleEl: v.titleEl, titleEn: v.titleEn }))
