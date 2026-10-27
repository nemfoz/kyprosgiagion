import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import sharp from "sharp"
import { readStored } from "@/lib/storage"

// Preview images for Facebook, WhatsApp, X…: the church's photo with its name, in the site's three colours.
export const OG_SIZE = { width: 1200, height: 630 }

const CRIMSON = "#6b1d1d", GOLD = "#ad8840", PARCHMENT = "#ece8de"
const fonts = Promise.all([
  readFile(path.join(process.cwd(), "assets/fonts/NotoSerif-Bold.ttf")),
  readFile(path.join(process.cwd(), "assets/fonts/NotoSans-Medium.ttf")),
])

// Greek capitals drop their accents (ΕΚΚΛΗΣΙΕΣ, not ΕΚΚΛΗΣΊΕΣ).
const upper = (text: string) => text.normalize("NFD").replace(/[\u0301\u0308]/g, "").toUpperCase().normalize("NFC")

/** The photo cropped to the card as a JPEG data URL (any stored format), or null. */
async function photoData(src: string | null | undefined) {
  const data = src ? await readStored(src) : null
  if (!data) return null
  try {
    const jpg = await sharp(data, { animated: false }).rotate().resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer()
    return `data:image/jpeg;base64,${jpg.toString("base64")}`
  } catch {
    return null
  }
}

export async function shareCard({ kicker, title, subtitle, footer, photo }: {
  kicker: string; title: string; subtitle?: string; footer?: string; photo?: string | null
}) {
  const [[serif, sans], image] = await Promise.all([fonts, photoData(photo)])
  const png = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundColor: CRIMSON, backgroundImage: `radial-gradient(ellipse at top right, ${GOLD}aa, transparent 70%)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        {image && <img src={image} width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} alt="" />}
        {image && <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", backgroundImage: "linear-gradient(to top, rgba(20,6,6,.92) 0%, rgba(20,6,6,.55) 45%, rgba(20,6,6,.05) 80%)" }} />}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, display: "flex", backgroundColor: GOLD }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "56px 72px", width: "100%", color: PARCHMENT }}>
          <div style={{ fontFamily: "Sans", fontSize: 24, letterSpacing: 4, color: GOLD }}>{upper(kicker)}</div>
          <div style={{ fontFamily: "Serif", fontSize: title.length > 48 ? 54 : 68, lineHeight: 1.1, marginTop: 14 }}>{title}</div>
          {subtitle && <div style={{ fontFamily: "Sans", fontSize: 30, marginTop: 14, opacity: 0.9 }}>{subtitle}</div>}
          {footer && <div style={{ fontFamily: "Sans", fontSize: 22, marginTop: 26, color: GOLD }}>{footer}</div>}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Serif", data: serif, weight: 700 }, { name: "Sans", data: sans, weight: 500 }] },
  )
  // As JPEG: a photo card is ~1 MB as PNG, too big for WhatsApp previews.
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
  return new Response(new Uint8Array(jpg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  })
}
