import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'

type CachedOnlyFansMedia = {
  bytes: Uint8Array
  contentType: string
  contentLength?: string
  expiresAtMs: number
  lastAccessedAtMs: number
}

const IMAGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const IMAGE_CACHE_MAX_ENTRIES = 300
const IMAGE_CACHE_MAX_BYTES = 2 * 1024 * 1024

function getMediaCache(): Map<string, CachedOnlyFansMedia> {
  const holder = globalThis as typeof globalThis & {
    __creatixOnlyFansMediaCache?: Map<string, CachedOnlyFansMedia>
  }
  if (!holder.__creatixOnlyFansMediaCache) {
    holder.__creatixOnlyFansMediaCache = new Map()
  }
  return holder.__creatixOnlyFansMediaCache
}

function makeCacheKey(userId: string, cdnUrl: string): string {
  return `${userId}::${cdnUrl.trim()}`
}

function pruneMediaCache(cache: Map<string, CachedOnlyFansMedia>) {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (value.expiresAtMs <= now) {
      cache.delete(key)
    }
  }
  if (cache.size <= IMAGE_CACHE_MAX_ENTRIES) return
  const ordered = Array.from(cache.entries()).sort(
    (a, b) => a[1].lastAccessedAtMs - b[1].lastAccessedAtMs,
  )
  const toRemove = cache.size - IMAGE_CACHE_MAX_ENTRIES
  for (let i = 0; i < toRemove; i += 1) {
    cache.delete(ordered[i][0])
  }
}

/**
 * GET: Proxy download for OnlyFans CDN media.
 * Query: ?cdnUrl=ENCODED_CDN_URL
 *
 * Uses OnlyFansAPI download pattern:
 *   GET https://app.onlyfansapi.com/api/{account}/media/download/{ONLYFANS_CDN_URL}
 *
 * CDN URLs are IP-locked and expire in ~20 minutes; always fetch via this API, not the browser.
 *
 * We stream the binary back to the client.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const cdnUrl = req.nextUrl.searchParams.get('cdnUrl')
    if (!cdnUrl) {
      return NextResponse.json({ error: 'cdnUrl query param is required' }, { status: 400 })
    }

    const cache = getMediaCache()
    const cacheKey = makeCacheKey(user.id, cdnUrl)
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAtMs > Date.now()) {
      cached.lastAccessedAtMs = Date.now()
      return new NextResponse(cached.bytes, {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          ...(cached.contentLength ? { 'Content-Length': cached.contentLength } : {}),
          'Cache-Control': 'private, max-age=21600, stale-while-revalidate=86400',
          'X-Creatix-Media-Cache': 'HIT',
        },
      })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const accountId = connection.access_token
    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OnlyFans API key not configured' }, { status: 500 })
    }

    const downloadUrl = `https://app.onlyfansapi.com/api/${accountId}/media/download/${encodeURIComponent(cdnUrl)}`
    const res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to download media from OnlyFans', status: res.status, body: text || undefined },
        { status: 502 },
      )
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const contentLength = res.headers.get('content-length')
    const contentLengthNum = contentLength ? Number(contentLength) : NaN
    const canCacheImage =
      contentType.startsWith('image/') &&
      (Number.isNaN(contentLengthNum) || contentLengthNum <= IMAGE_CACHE_MAX_BYTES)

    if (canCacheImage) {
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (bytes.byteLength <= IMAGE_CACHE_MAX_BYTES) {
        cache.set(cacheKey, {
          bytes,
          contentType,
          contentLength: String(bytes.byteLength),
          expiresAtMs: Date.now() + IMAGE_CACHE_TTL_MS,
          lastAccessedAtMs: Date.now(),
        })
        pruneMediaCache(cache)
      }
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(bytes.byteLength),
          'Cache-Control': 'private, max-age=21600, stale-while-revalidate=86400',
          'X-Creatix-Media-Cache': 'MISS',
        },
      })
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600',
        'X-Creatix-Media-Cache': 'BYPASS',
      },
    })
  } catch (err) {
    console.error('[onlyfans/media/download]', err)
    return NextResponse.json({ error: 'Failed to download media' }, { status: 500 })
  }
}

