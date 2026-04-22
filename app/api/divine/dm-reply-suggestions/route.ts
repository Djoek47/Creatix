import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { fetchDmReplySuggestionsPackage } from '@/lib/divine/dm-reply-package'
import {
  consumeAiCredits,
  insufficientAiCreditsResponse,
} from '@/lib/billing/consume-ai-credits'
import { CREDITS_MESSAGE_GENERATION_BUNDLE } from '@/lib/billing/credit-economics'

/**
 * POST: Get Scan Thread + Circe / Venus / Flirt reply suggestions for a fan, plus a recommendation.
 * Body: { fanId: string, username?: string, name?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const fanId = typeof body?.fanId === 'string' ? body.fanId : typeof body?.fan_id === 'string' ? body.fan_id : 'unknown'
    const requestId =
      typeof body?.requestId === 'string'
        ? body.requestId
        : req.headers.get('x-idempotency-key') || req.headers.get('x-request-id') || crypto.randomUUID()
    const debit = await consumeAiCredits(supabase, user.id, CREDITS_MESSAGE_GENERATION_BUNDLE, {
      reasonCode: 'message_generation_bundle',
      reasonRef: `dm_reply_package:${fanId}:${requestId}`,
      idempotencyKey: `dm_reply_package:${user.id}:${fanId}:${requestId}`,
      metadata: { endpoint: '/api/divine/dm-reply-suggestions', fan_id: fanId },
    })
    if (!debit.ok) return insufficientAiCreditsResponse(debit.used, debit.limit)

    const result = await fetchDmReplySuggestionsPackage(supabase, user.id, body)
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    const { threadPreview: _tp, ...rest } = result as Record<string, unknown>
    return NextResponse.json(rest)
  } catch (e) {
    console.error('[divine/dm-reply-suggestions]', e)
    return NextResponse.json({ error: 'Failed to generate reply suggestions' }, { status: 500 })
  }
}
