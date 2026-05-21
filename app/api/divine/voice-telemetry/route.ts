import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { consumeAiCredits } from '@/lib/billing/consume-ai-credits'
import { divineVoiceCreditsForWholeSeconds } from '@/lib/billing/credit-economics'
import { divineManagerDebitMetadata } from '@/lib/billing/divine-manager-ledger'

const MAX_MS_PER_STATE_PER_REQUEST = 120_000
/** Cap billed wall-clock per telemetry flush (three dimensions × clamp each). */
const MAX_BILLABLE_MS_PER_REQUEST = MAX_MS_PER_STATE_PER_REQUEST * 3

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const clamp = (n: unknown) => {
    const x = Math.floor(Number(n))
    if (!Number.isFinite(x) || x < 0) return 0
    return Math.min(MAX_MS_PER_STATE_PER_REQUEST, x)
  }

  const idle = clamp(body.idle_ms)
  const working = clamp(body.working_ms)
  const speaking = clamp(body.speaking_ms)
  if (idle + working + speaking === 0) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const day = typeof body.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : new Date().toISOString().slice(0, 10)

  const flushRaw = typeof body.telemetry_flush_id === 'string' ? body.telemetry_flush_id.trim() : ''
  const telemetryFlushId =
    flushRaw.length >= 8 && flushRaw.length <= 200 ? flushRaw.slice(0, 200) : `legacy:${day}:${Date.now()}`

  const totalMs = Math.min(idle + working + speaking, MAX_BILLABLE_MS_PER_REQUEST)
  const wholeSeconds = Math.max(0, Math.floor(totalMs / 1000))
  const credits = divineVoiceCreditsForWholeSeconds(wholeSeconds)

  if (credits > 0) {
    const debit = await consumeAiCredits(supabase, user.id, credits, {
      reasonCode: 'divine_manager_live_voice',
      reasonRef: `divine_voice_telemetry:${user.id}:${telemetryFlushId}`,
      idempotencyKey: `divine_voice_telemetry:${user.id}:${telemetryFlushId}`,
      metadata: divineManagerDebitMetadata('Live voice (Realtime)', null),
    })
    if (!debit.ok) {
      return NextResponse.json(
        {
          error: 'Insufficient AI credits for Divine live voice.',
          code: 'ai_credits_exhausted',
          used: debit.used,
          limit: debit.limit,
        },
        { status: 402 },
      )
    }
  }

  const admin = createServiceRoleClient()
  const { error } = await admin.rpc('increment_divine_voice_state_daily', {
    p_user_id: user.id,
    p_day: day,
    p_idle: idle,
    p_working: working,
    p_speaking: speaking,
  })

  if (error) {
    console.error('[voice-telemetry]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, credits_debited: credits })
}
