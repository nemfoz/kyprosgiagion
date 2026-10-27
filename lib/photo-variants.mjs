// Makes the smaller WebP copies of a photo (see lib/photo-sizes.mjs). Server/scripts only.
import sharp from "sharp"
import { PHOTO_SIZES } from "./photo-sizes.mjs"

/**
 * @param {Buffer} data the original image
 * @returns {Promise<{ size: "sm" | "md", data: Buffer }[]>}
 */
export async function makeVariants(data) {
  return Promise.all(Object.entries(PHOTO_SIZES).map(async ([size, px]) => ({
    size: /** @type {"sm" | "md"} */ (size),
    data: await sharp(data, { animated: false })
      .rotate() // honour the camera's orientation before EXIF is dropped
      .resize(px, px, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: size === "sm" ? 72 : 78 })
      .toBuffer(),
  })))
}
