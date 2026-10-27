import { NextResponse } from "next/server"
import { assertRole, Forbidden, UserError } from "@/lib/session"
import { getAdminT } from "@/lib/i18n-server"
import { isAdmin } from "@/lib/permissions"
import { addPhoto, getSite } from "@/lib/sites"
import { IMAGE_TYPES, storePhoto } from "@/lib/storage"

// Photo upload. The body is the image itself (the browser resizes it first; Vercel limits bodies to 4.5 MB).
//   ?site=<id>  admins: stored and attached to the church right away
//   (no site)   approved users/admins: stored for a proposal, attached when an admin approves it
export async function POST(req: Request) {
  const t = await getAdminT()
  try {
    const user = await assertRole("approved")
    const type = (req.headers.get("content-type") || "").split(";")[0]
    if (!IMAGE_TYPES[type]) return NextResponse.json({ error: t("error.image.sendImage") }, { status: 400 })
    const data = Buffer.from(await req.arrayBuffer())
    if (!data.length || data.length > 4.4 * 1024 * 1024) return NextResponse.json({ error: t("error.image.tooLarge") }, { status: 413 })
    const credit = decodeURIComponent(req.headers.get("x-credit") || "")
    const siteId = Number(new URL(req.url).searchParams.get("site")) || null

    if (siteId) {
      if (!isAdmin(user.role)) return NextResponse.json({ error: t("error.adminOnly") }, { status: 403 })
      const site = await getSite({ id: siteId })
      if (!site) return NextResponse.json({ error: t("error.site.notFound") }, { status: 404 })
      const src = await storePhoto(site.slug, data, type)
      return NextResponse.json({ photo: await addPhoto(site.id, { src, credit }) })
    }
    const src = await storePhoto("proposal", data, type)
    return NextResponse.json({ pending: { src, credit, captionEl: "", captionEn: "", sourceUrl: "", historic: false } })
  } catch (e) {
    if (e instanceof UserError) {
      return NextResponse.json({ error: e.messages.map((m) => t(m.key, m.vars)).join(" ") }, { status: e instanceof Forbidden ? 403 : 400 })
    }
    console.error(e)
    return NextResponse.json({ error: t("error.uploadFailed") }, { status: 500 })
  }
}
