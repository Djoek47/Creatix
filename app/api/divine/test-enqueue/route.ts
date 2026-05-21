import { type NextRequest, NextResponse } from 'next/server'
import { applyMarkitCorsHeaders, markitCorsOptions } from '@/lib/cors-markit'
import { enqueueMarkitDivineAction } from '@/lib/divine/markit-divine-bridge'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'

/**
 * When `DIVINE_TEST_ENQUEUE_SECRET` is set, the caller must send
 * `x-divine-test-secret: <same value>`. If unset, only `NODE_ENV === 'development'`
 * may enqueue (local smoke tests). Production: always set the secret.
 */
function allowTestEnqueue(request: NextRequest): boolean {
  const secret = process.env.DIVINE_TEST_ENQUEUE_SECRET?.trim()
  const sent = request.headers.get('x-divine-test-secret')?.trim()
  if (secret) {
    return sent === secret
  }
  return process.env.NODE_ENV === 'development'
}

export function OPTIONS(request: NextRequest) {
  return markitCorsOptions(request)
}

/**
 * Pushes a sample `EditorDivineUiAction` into the per-user queue for the SSE stream
 * (`GET /api/divine/action-stream`). For integration testing only.
 */
export async function POST(request: NextRequest) {
  if (!allowTestEnqueue(request)) {
    return applyMarkitCorsHeaders(
      request,
      NextResponse.json(
        { error: 'Set DIVINE_TEST_ENQUEUE_SECRET on Creatix and send matching x-divine-test-secret' },
        { status: 403 },
      ),
    )
  }

  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return applyMarkitCorsHeaders(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  let action: unknown
  try {
    action = (await request.json()) as unknown
  } catch {
    return applyMarkitCorsHeaders(request, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
  }
  if (!action || typeof action !== 'object') {
    return applyMarkitCorsHeaders(request, NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 }))
  }

  enqueueMarkitDivineAction(user.id, action)
  return applyMarkitCorsHeaders(
    request,
    NextResponse.json({ ok: true, enqueued: true }, { status: 200 }),
  )
}
