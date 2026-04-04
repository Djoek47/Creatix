import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'

const MAX_MS_PER_STATE_PER_REQUEST = 120_000

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

  return NextResponse.json({ ok: true })
}
