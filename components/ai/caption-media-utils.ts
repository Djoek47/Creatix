'use client'

/** Resize and compress image to stay under maxBytes. Returns data URL (JPEG). */
function compressImageForUpload(
  file: File,
  maxSize = 1024,
  quality = 0.82,
  maxBytes = 750 * 1024,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      const scale = Math.min(1, maxSize / Math.max(w, h))
      const cw = Math.round(w * scale)
      const ch = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, cw, ch)
      let q = quality
      const tryExport = (): string | null => {
        try {
          return canvas.toDataURL('image/jpeg', q)
        } catch {
          return null
        }
      }
      let dataUrl = tryExport()
      while (dataUrl && dataUrl.length > maxBytes && q > 0.2) {
        q -= 0.1
        dataUrl = tryExport()
      }
      if (dataUrl) resolve(dataUrl)
      else reject(new Error('Could not compress image'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

/** Tighter compression for vision APIs (e.g. Grok): max ~350KB to avoid 422/413. */
export function compressImageForVision(file: File): Promise<string> {
  return compressImageForUpload(file, 800, 0.72, 350 * 1024)
}

/** Grab an early frame from a video file as a JPEG data URL (for vision / caption). */
export function extractVideoFrameAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.src = url
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.25, (video.duration || 1) * 0.05)
      } catch {
        video.currentTime = 0.1
      }
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const w = video.videoWidth
        const h = video.videoHeight
        if (!w || !h) {
          cleanup()
          reject(new Error('Invalid video dimensions'))
          return
        }
        const max = 800
        const scale = Math.min(1, max / Math.max(w, h))
        canvas.width = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          reject(new Error('Canvas not supported'))
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            cleanup()
            if (!blob) {
              reject(new Error('Could not export frame'))
              return
            }
            const reader = new FileReader()
            reader.onload = () => {
              const r = reader.result
              if (typeof r === 'string') resolve(r)
              else reject(new Error('Read failed'))
            }
            reader.onerror = () => reject(new Error('Read failed'))
            reader.readAsDataURL(blob)
          },
          'image/jpeg',
          0.82,
        )
      } catch (e) {
        cleanup()
        reject(e instanceof Error ? e : new Error('Frame export failed'))
      }
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Could not load video'))
    }
  })
}
