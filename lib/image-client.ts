// Browser-side: resize large photos (max 2400 px, JPEG) before uploading, so they stay small and fast
// (and under Vercel's 4.5 MB request limit).
export async function shrinkImage(file: File, max = 2400): Promise<Blob> {
  if (file.type === "image/gif") return file
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 2.5e6) return file
  const canvas = Object.assign(document.createElement("canvas"), {
    width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale),
  })
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85))
}

export async function uploadPhoto(file: File, { siteId, credit }: { siteId?: number; credit: string }) {
  const body = await shrinkImage(file)
  const res = await fetch(`/api/photos${siteId ? `?site=${siteId}` : ""}`, {
    method: "POST", body, headers: { "Content-Type": body.type, "X-Credit": encodeURIComponent(credit) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}
