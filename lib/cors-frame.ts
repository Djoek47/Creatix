import { NextRequest, NextResponse } from 'next/server'

/** Origins allowed to call Frame/Markit CORS APIs (comma-separated `NEXT_PUBLIC_FRAME_URL`). */
export function getAllowedFrameOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_FRAME_URL || ''
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

/** Allow browser calls from deployed Frame/Markit URLs (when `NEXT_PUBLIC_FRAME_URL` is set). */
export function applyFrameCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const allowed = getAllowedFrameOrigins()
  const origin = request.headers.get('origin')
  if (origin && allowed.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Range, X-Frame-Export-Secret',
    )
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  return response
}

export function frameCorsOptions(request: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 })
  return applyFrameCorsHeaders(request, res)
}
