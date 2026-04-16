import { NextRequest, NextResponse } from 'next/server'

/** Allow browser calls from the deployed Frame origin (when set). */
export function applyFrameCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const frameOrigin = (process.env.NEXT_PUBLIC_FRAME_URL || '').replace(/\/$/, '')
  const origin = request.headers.get('origin')
  if (frameOrigin && origin && (origin === frameOrigin || origin.startsWith(frameOrigin))) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  return response
}

export function frameCorsOptions(request: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 })
  return applyFrameCorsHeaders(request, res)
}
