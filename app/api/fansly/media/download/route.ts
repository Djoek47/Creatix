import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

export const runtime = 'nodejs'

/** Large vault / chat videos can exceed default Vercel limits. */
export const maxDuration = 180

const FANSLY_PARTNER_BASE = 'https://v1.apifansly.com'

/** Hosts allowed for `cdnUrl` — Fansly CDN / media only (not www marketing). */
function isFanslyMediaCdnHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h !== 'fansly.com' && !h.endsWith('.fansly.com')) return false
  if (h.startsWith('cdn')) return true
  return h === 'media.fansly.com' || h === 'thumbs.fansly.com'
}

/**
 * GET — Stream Fansly CDN media via ApiFansly (same pattern as OnlyFans partner download).
 *
 * Query: `cdnUrl` = full `https://cdn3.fansly.com/...` URL (path-only responses from chat
 * mapping are expanded to this host before calling). Unsigned CDN URLs return **403**
 * from CloudFront (`MissingKey-Pair-Id`); the partner signs / fetches server-side.
 *
 * @see https://docs.apifansly.com/api-reference/media/download-media
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

    const billingBlock = await fanslyBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    const hasFansly =
      (connection?.access_token != null && String(connection.access_token).trim() !== '') ||
      (connection?.platform_user_id != null && String(connection.platform_user_id).trim() !== '')
    if (!hasFansly) {
      return NextResponse.json({ error: 'Fansly is not connected' }, { status: 400 })
    }

    const apiKey = process.env.FANSLY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Fansly API key not configured' }, { status: 500 })
    }

    const cdnUrlRaw = req.nextUrl.searchParams.get('cdnUrl')
    if (!cdnUrlRaw || !cdnUrlRaw.trim()) {
      return NextResponse.json({ error: 'cdnUrl query param is required' }, { status: 400 })
    }

    let target: URL
    try {
      target = new URL(cdnUrlRaw.trim())
    } catch {
      return NextResponse.json({ error: 'Invalid cdnUrl' }, { status: 400 })
    }

    if (target.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only https CDN URLs are allowed' }, { status: 400 })
    }

    if (!isFanslyMediaCdnHost(target.hostname)) {
      return NextResponse.json({ error: 'Host not allowed for Fansly media download' }, { status: 403 })
    }

    const res = await fetch(`${FANSLY_PARTNER_BASE}/api/fansly/media/download`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cdnUrl: cdnUrlRaw.trim() }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        {
          error: 'Fansly media download failed',
          status: res.status,
          body: text.length > 800 ? `${text.slice(0, 800)}…` : text || undefined,
        },
        { status: 502 },
      )
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const contentLength = res.headers.get('content-length')

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    console.error('[fansly/media/download]', err)
    return NextResponse.json({ error: 'Failed to download Fansly media' }, { status: 500 })
  }
}
