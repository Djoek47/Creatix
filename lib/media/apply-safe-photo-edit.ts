import sharp from 'sharp'

export function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | { error: string } {
  const m = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl.trim())
  if (!m) {
    const raw = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl
    try {
      const buffer = Buffer.from(raw, 'base64')
      if (buffer.length < 32) return { error: 'Invalid image' }
      if (buffer.length > 14 * 1024 * 1024) return { error: 'Image too large' }
      return { buffer, mime: 'image/jpeg' }
    } catch {
      return { error: 'Invalid base64' }
    }
  }
  const mime = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase()
  try {
    const buffer = Buffer.from(m[2], 'base64')
    if (buffer.length < 32) return { error: 'Invalid image' }
    if (buffer.length > 14 * 1024 * 1024) return { error: 'Image too large' }
    return { buffer, mime }
  } catch {
    return { error: 'Invalid base64' }
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type SafeEditBody =
  | { operation: 'blur'; imageBase64: string; sigma?: number }
  | { operation: 'lighting'; imageBase64: string; brightness?: number }
  | {
      operation: 'emoji'
      imageBase64: string
      emoji: string
      xPercent: number
      yPercent: number
      sizePercent?: number
    }

/**
 * Server-side safe touch-up only: blur, brightness, emoji overlay. No inpaint, beautify, or generative edits.
 */
export async function applySafePhotoEdit(body: SafeEditBody): Promise<{ imageBase64: string } | { error: string }> {
  const parsedImg = parseDataUrl(body.imageBase64)
  if ('error' in parsedImg) {
    return { error: parsedImg.error }
  }

  const base = sharp(parsedImg.buffer).rotate()
  const meta = await base.metadata()
  if (!meta.width || !meta.height) {
    return { error: 'Could not read image dimensions' }
  }
  const w = meta.width
  const h = meta.height
  if (w > 6000 || h > 6000) {
    return { error: 'Image dimensions too large' }
  }

  try {
    let out: Buffer
    if (body.operation === 'blur') {
      const sigma = body.sigma ?? 10
      out = await base.clone().blur(sigma).jpeg({ quality: 88 }).toBuffer()
    } else if (body.operation === 'lighting') {
      const b = body.brightness ?? 1.08
      out = await base.clone().modulate({ brightness: b, saturation: 1 }).jpeg({ quality: 88 }).toBuffer()
    } else {
      const emoji = body.emoji
      const sizePct = body.sizePercent ?? 12
      const fontSize = Math.max(16, Math.round((Math.min(w, h) * sizePct) / 100))
      const cx = Math.round((w * body.xPercent) / 100)
      const cy = Math.round((h * body.yPercent) / 100)
      const svg = Buffer.from(
        `<svg width="${w}" height="${h}"><text x="${cx}" y="${cy}" font-size="${fontSize}" dominant-baseline="middle" text-anchor="middle">${escapeXml(emoji)}</text></svg>`,
      )
      const overlay = await sharp(svg).png().toBuffer()
      const raster = await base.clone().png().toBuffer()
      out = await sharp(raster).composite([{ input: overlay, left: 0, top: 0 }]).jpeg({ quality: 88 }).toBuffer()
    }
    const b64 = out.toString('base64')
    return { imageBase64: `data:image/jpeg;base64,${b64}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Image processing failed'
    return { error: msg }
  }
}
