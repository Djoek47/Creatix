/**
 * OnlyFans CDN assets use CloudFront signed URLs that are IP-bound. Loading them
 * directly in `<img src>` from the user's browser often returns 403 (policy SourceIp).
 *
 * For OnlyFans hosts we always route through the authenticated app origin:
 *   GET /api/onlyfans/media/download?cdnUrl=...
 * which uses OnlyFansAPI's media/download path (same as upload pipeline) so the
 * bytes are fetched in an allowed context and streamed to the signed-in client.
 *
 * Fansly **avatars / list thumbnails**: simple `/api/proxy/image` (Referer) works and is cheap.
 *
 * Fansly **chat attachments / PPV / vault bytes** often need CloudFront signing (`MissingKey-Pair-Id` on bare
 * URLs). Use `proxyFanslyAttachmentUrl()` for those — it routes through ApiFansly partner download:
 *   GET /api/fansly/media/download?cdnUrl=...
 * @see https://docs.apifansly.com/api-reference/media/download-media
 */

function isFanslyCdnHost(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.includes('fansly.com') ||
    lower.includes('cdn.fansly.com') ||
    lower.includes('media.fansly.com') ||
    lower.includes('thumbs.fansly.com')
  )
}

function isOnlyFansCdnHost(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return h === 'onlyfans.com' || h.endsWith('.onlyfans.com')
  } catch {
    const lower = url.toLowerCase()
    return lower.includes('onlyfans.com')
  }
}

export function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  if (isOnlyFansCdnHost(url)) {
    return `/api/onlyfans/media/download?cdnUrl=${encodeURIComponent(url)}`
  }

  if (!isFanslyCdnHost(url)) return url

  return `/api/proxy/image?url=${encodeURIComponent(url)}`
}

/**
 * Fansly chat / vault **media files** (photos, videos, PPV) — partner download handles CloudFront signing.
 * For **profile avatars** and conversation list thumbs, use `proxyImageUrl` instead.
 */
export function proxyFanslyAttachmentUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (!isFanslyCdnHost(url)) return undefined
  return `/api/fansly/media/download?cdnUrl=${encodeURIComponent(url)}`
}

/**
 * Use in **chat bubbles**, **vault previews**, and any Fansly **attachment** surface.
 * Fansly → partner download; OnlyFans → partner download via `proxyImageUrl`; other URLs pass through.
 */
export function proxifyChatOrVaultMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return proxyFanslyAttachmentUrl(url) ?? proxyImageUrl(url)
}
