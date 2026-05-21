import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS for browser clients on Markit (cross-origin POST to Creatix Realtime with Bearer).
 * Set `NEXT_PUBLIC_MARKIT_URL` to the Markit origin(s), comma-separated, no trailing slashes
 * (e.g. `https://markit.com,https://markit-fawn.vercel.app`).
 */
function parseMarkitOrigins(): string[] {
  const raw = (process.env.NEXT_PUBLIC_MARKIT_URL || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return new URL(s).origin
      } catch {
        return null
      }
    })
    .filter((origin): origin is string => Boolean(origin))
}

function allowedMarkitOrigin(request: NextRequest): string | null {
  const origins = parseMarkitOrigins()
  if (origins.length === 0) return null
  const requestOrigin = request.headers.get('origin')
  if (!requestOrigin) return null
  const normalizedRequestOrigin = (() => {
    try {
      return new URL(requestOrigin).origin
    } catch {
      return null
    }
  })()
  if (!normalizedRequestOrigin) return null
  for (const markit of origins) {
    if (normalizedRequestOrigin === markit) return normalizedRequestOrigin
  }
  return null
}

export function applyMarkitCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const o = allowedMarkitOrigin(request)
  if (o) {
    response.headers.set('Access-Control-Allow-Origin', o)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, x-idempotency-key, Cache-Control, Accept',
    )
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  return response
}

export function markitCorsOptions(request: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 })
  return applyMarkitCorsHeaders(request, res)
}
