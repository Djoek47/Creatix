'use client'

/**
 * Upload local media for Fansly chat / mass messages without sending large bodies through Next.js
 * when possible (Vercel serverless ~4.5MB limit → 413).
 *
 * - Files **≤ ~4MB**: multipart to `/api/fansly/media/upload`.
 * - Larger files: direct upload to Vercel Blob, then JSON `{ file_url }` to the same API.
 */

const MULTIPART_SAFE_MAX = 4 * 1024 * 1024

export type FanslyUploadResult = { id: string; url?: string; type?: string }

async function uploadViaMultipart(file: File): Promise<FanslyUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/fansly/media/upload', { method: 'POST', body: formData })
  if (res.status === 413) {
    throw new Error('413_PAYLOAD_TOO_LARGE')
  }
  const data = (await res.json()) as { id?: string; error?: string; url?: string; type?: string }
  if (!res.ok || !data.id) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return { id: data.id, url: data.url, type: data.type }
}

async function uploadViaBlobThenUrl(file: File): Promise<FanslyUploadResult> {
  const { upload } = await import('@vercel/blob/client')
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/fansly-upload',
    multipart: file.size > 5 * 1024 * 1024,
  })

  const res = await fetch('/api/fansly/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_url: blob.url }),
  })
  const data = (await res.json()) as { id?: string; error?: string; url?: string; type?: string }
  if (!res.ok || !data.id) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return { id: data.id, url: data.url, type: data.type }
}

/** Upload a local `File` and return Fansly media id for `mediaIds` / `fanslyMediaIds`. */
export async function uploadLocalFileToFanslyMedia(file: File): Promise<FanslyUploadResult> {
  if (file.size <= MULTIPART_SAFE_MAX) {
    try {
      return await uploadViaMultipart(file)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === '413_PAYLOAD_TOO_LARGE' || msg.includes('413') || msg.includes('Too Large')) {
        return uploadViaBlobThenUrl(file)
      }
      throw e
    }
  }
  return uploadViaBlobThenUrl(file)
}
