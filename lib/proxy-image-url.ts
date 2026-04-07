/**
 * OnlyFans CDN assets use CloudFront signed URLs that are IP-bound. Loading them
 * directly in `<img src>` from the user's browser often returns 403 (policy SourceIp).
 *
 * For OnlyFans hosts we always route through the authenticated app origin:
 *   GET /api/onlyfans/media/download?cdnUrl=...
 * which uses OnlyFansAPI's media/download path (same as upload pipeline) so the
 * bytes are fetched in an allowed context and streamed to the signed-in client.
 *
 * Fansly: unsigned URLs can use `/api/proxy/image` (referrer/hotlink). Signed
 * CloudFront URLs are tried via proxy when possible; the browser may still load
 * the raw URL as a fallback (see `buildMediaSrcChain` in chat-window).
 */

function isCloudFrontSigned(url: string): boolean {
  const q = url.toLowerCase()
  return q.includes('signature=') || q.includes('policy=') || q.includes('key-pair-id=')
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

  const lower = url.toLowerCase()
  const isFanslyHost =
    lower.includes('fansly.com') ||
    lower.includes('cdn.fansly.com') ||
    lower.includes('media.fansly.com') ||
    lower.includes('thumbs.fansly.com')

  if (!isFanslyHost) return url

  if (isCloudFrontSigned(url)) return url

  return `/api/proxy/image?url=${encodeURIComponent(url)}`
}
