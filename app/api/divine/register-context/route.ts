import { type NextRequest, NextResponse } from 'next/server'
import { applyMarkitCorsHeaders, markitCorsOptions } from '@/lib/cors-markit'
import { setMarkitEditorContext } from '@/lib/divine/markit-divine-bridge'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'

export function OPTIONS(request: NextRequest) {
  return markitCorsOptions(request)
}

/**
 * Attach Markit editor JSON (timeline summary, import hints, etc.) to the current session server-side.
 * Downstream services can read via `getMarkitEditorContext` (extend as needed).
 */
export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return applyMarkitCorsHeaders(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }
  const body: unknown = await request.json().catch(() => null)
  if (body === null) {
    return applyMarkitCorsHeaders(request, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
  }
  setMarkitEditorContext(user.id, body)
  return applyMarkitCorsHeaders(request, NextResponse.json({ ok: true }))
}
