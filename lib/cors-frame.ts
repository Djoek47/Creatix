import { NextRequest, NextResponse } from 'next/server'

function configuredEditorOrigins(): Set<string> {
  const raw = [process.env.NEXT_PUBLIC_MARKIT_URL, process.env.NEXT_PUBLIC_FRAME_URL].filter(Boolean).join(',')
  const origins = new Set<string>()

  for (const value of raw.split(',')) {
    const trimmed = value.trim()
    if (!trimmed) continue
    try {
      origins.add(new URL(trimmed).origin)
    } catch {
      // Optional env; ignore malformed entries.
    }
  }

  return origins
}

/** Allow browser calls from deployed Markit/legacy Frame origins when configured. */
export function applyFrameCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin')
  const requestOrigin = (() => {
    if (!origin) return null
    try {
      return new URL(origin).origin
    } catch {
      return null
    }
  })()
  if (requestOrigin && configuredEditorOrigins().has(requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Range, x-idempotency-key, x-frame-export-secret',
    )
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  return response
}

export function frameCorsOptions(request: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 })
  return applyFrameCorsHeaders(request, res)
}
