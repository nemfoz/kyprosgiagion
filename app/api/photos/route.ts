import { NextResponse } from "next/server"
import { assertRole, Forbidden } from "@/lib/session"
import { isAdmin } from "@/lib/permissions"
import { addPhoto, getSite } from "@/lib/sites"
import { IMAGE_TYPES, storePhoto } from "@/lib/storage"

// Photo upload. The body is the image itself (the browser resizes it first; Vercel limits bodies to 4.5 MB).
//   ?site=<id>  admins: stored and attached to the church right away
//   (no site)   approved users/admins: stored for a proposal, attached when an admin approves it
export async function POST(req: Request) {
  try {
    const user = await assertRole("approved")
    const type = (req.headers.get("content-type") || "").split(";")[0]
    if (!IMAGE_TYPES[type]) return NextResponse.json({ error: "Στείλτε εικόνα JPEG, PNG, WebP ή GIF." }, { status: 400 })
    const data = Buffer.from(await req.arrayBuffer())
    if (!data.length || data.length > 4.4 * 1024 * 1024) return NextResponse.json({ error: "Η εικόνα είναι πολύ μεγάλη." }, { status: 413 })
    const credit = decodeURIComponent(req.headers.get("x-credit") || "")
    const siteId = Number(new URL(req.url).searchParams.get("site")) || null

    if (siteId) {
      if (!isAdmin(user.role)) return NextResponse.json({ error: "Μόνο για διαχειριστές." }, { status: 403 })
      const site = await getSite({ id: siteId })
      if (!site) return NextResponse.json({ error: "Η εκκλησία δεν βρέθηκε." }, { status: 404 })
      const src = await storePhoto(site.slug, data, type)
      return NextResponse.json({ photo: await addPhoto(site.id, { src, credit }) })
    }
    const src = await storePhoto("proposal", data, type)
    return NextResponse.json({ pending: { src, credit, captionEl: "", captionEn: "", sourceUrl: "", historic: false } })
  } catch (e) {
    if (e instanceof Forbidden) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: "Η μεταφόρτωση απέτυχε." }, { status: 500 })
  }
}
