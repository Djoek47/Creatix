'use client'

/**
 * Upload local media for OnlyFans chat / posts without sending file bytes through Next.js
 * (Vercel serverless request body limit ~4.5MB → 413 FUNCTION_PAYLOAD_TOO_LARGE).
 *
 * - Files **≤ ~4MB**: multipart to `/api/onlyfans/media/upload` (fast path).
 * - Larger files: direct upload to Vercel Blob, then JSON `{ file_url }` to the same API.
 */

const MULTIPART_SAFE_MAX = 4 * 1024 * 1024

export type OnlyFansUploadResult = { id: string; url?: string; type?: string }

async function uploadViaMultipart(file: File): Promise<OnlyFansUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/onlyfans/media/upload', { method: 'POST', body: formData })
  if (res.status === 413) {
    throw new Error('413_PAYLOAD_TOO_LARGE')
  }
  const data = (await res.json()) as { id?: string; error?: string; url?: string; type?: string }
  if (!res.ok || !data.id) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return { id: data.id, url: data.url, type: data.type }
}

async function uploadViaBlobThenUrl(file: File): Promise<OnlyFansUploadResult> {
  const { upload } = await import('@vercel/blob/client')
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/onlyfans-upload',
    multipart: file.size > 5 * 1024 * 1024,
  })

  const res = await fetch('/api/onlyfans/media/upload', {
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

/**
 * Upload a local `File` and return OnlyFans API media id (`ofapi_media_*`).
 */
export async function uploadLocalFileToOnlyFansMedia(file: File): Promise<OnlyFansUploadResult> {
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
