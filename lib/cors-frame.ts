import { NextRequest, NextResponse } from 'next/server'

/** Allow browser calls from the deployed Frame origin (when set). */
export function applyFrameCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const frameOriginRaw = (process.env.NEXT_PUBLIC_FRAME_URL || '').trim()
  const origin = request.headers.get('origin')
  const frameOrigin = (() => {
    if (!frameOriginRaw) return null
    try {
      return new URL(frameOriginRaw).origin
    } catch {
      return null
    }
  })()
  const requestOrigin = (() => {
    if (!origin) return null
    try {
      return new URL(origin).origin
    } catch {
      return null
    }
  })()
  if (frameOrigin && requestOrigin && requestOrigin === frameOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Range, x-idempotency-key',
    )
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  return response
}

export function frameCorsOptions(request: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 })
  return applyFrameCorsHeaders(request, res)
}
