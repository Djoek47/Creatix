import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS for browser clients on Markit (cross-origin POST to Creatix Realtime with Bearer).
 * Set `NEXT_PUBLIC_MARKIT_URL` to the Markit origin (no trailing slash), e.g. https://markit.example.com
 */
function allowedMarkitOrigin(request: NextRequest): string | null {
  const markit = (process.env.NEXT_PUBLIC_MARKIT_URL || '').replace(/\/$/, '')
  if (!markit) return null
  const origin = request.headers.get('origin')
  if (!origin) return null
  if (origin === markit || origin.startsWith(`${markit}/`)) return origin
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
