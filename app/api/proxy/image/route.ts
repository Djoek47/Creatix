import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/** Allowlisted hosts for Fansly / generic proxy (OnlyFans uses /api/onlyfans/media/download instead). */
function isAllowedImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'fansly.com' ||
    h.endsWith('.fansly.com') ||
    h === 'cdn.fansly.com' ||
    h === 'media.fansly.com' ||
    h === 'thumbs.fansly.com'
  )
}

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid URL scheme' }, { status: 400 })
  }

  if (!isAllowedImageHost(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    let referer = 'https://fansly.com/'
    let origin: string | undefined = 'https://fansly.com'
    try {
      const host = target.hostname.toLowerCase()
      if (host.includes('fansly')) {
        referer = 'https://fansly.com/'
        origin = 'https://fansly.com'
      }
    } catch {
      // fall back to fansly
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: referer,
        ...(origin ? { Origin: origin } : {}),
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${response.status}` }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 })
  }
}
