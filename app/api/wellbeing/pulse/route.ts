import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { computeGlowInsightsForUser } from '@/lib/wellbeing/compute-glow-insights'
import { gatherPulseSignals } from '@/lib/wellbeing/pulse-signals'
import { buildPulsePayload, pulsePayloadSchema } from '@/lib/wellbeing/pulse-engine'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'

export const maxDuration = 60

function pulseCacheTtlSec(): number {
  const raw = process.env.PULSE_CACHE_TTL_SEC
  if (raw == null || raw === '') return 300
  const n = Number(raw)
  return Number.isFinite(n) && n >= 30 && n <= 3600 ? Math.floor(n) : 300
}

function degradedGlow(): GlowInsightsPayload {
  const now = new Date().toISOString()
  return {
    insightSource: 'baseline',
    locationHint: 'Degraded',
    glowScore: 56,
    nextGoldenHour: { start: '—', end: '—', minutesUntil: 0 },
    timeline: [],
    perfectShotDays: [],
    positioning: { azimuthDeg: 0, bestFacingDirection: '—', environments: [] },
    actionCapsules: [],
    insightSentence:
      'Light and weather detail is limited right now; workload and safety signals still apply.',
    updatedAt: now,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ttlSec = pulseCacheTtlSec()
    const force = request.nextUrl.searchParams.get('force') === '1'

    if (!force) {
      const { data: row, error: readErr } = await supabase
        .from('creator_pulse_snapshots')
        .select('payload, computed_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!readErr && row?.payload && row.computed_at) {
        const ageSec = (Date.now() - new Date(row.computed_at).getTime()) / 1000
        if (ageSec >= 0 && ageSec < ttlSec) {
          const parsed = pulsePayloadSchema.safeParse(row.payload)
          if (parsed.success) {
            return NextResponse.json({
              pulse: parsed.data,
              cache: { hit: true, ttlSec, ageSec: Math.round(ageSec) },
            })
          }
        }
      }
    }

    const glowResult = await computeGlowInsightsForUser(supabase, user)
    const glow: GlowInsightsPayload = glowResult.ok ? glowResult.data : degradedGlow()

    const raw = await gatherPulseSignals(supabase, user.id)
    const pulse = await buildPulsePayload({ raw, glow })

    const { error: writeErr } = await supabase.from('creator_pulse_snapshots').upsert(
      {
        user_id: user.id,
        payload: pulse,
        computed_at: pulse.computedAt,
      },
      { onConflict: 'user_id' },
    )
    if (writeErr) {
      console.warn('[wellbeing/pulse] cache upsert:', writeErr.message)
    }

    return NextResponse.json({
      pulse,
      cache: { hit: false, ttlSec, ageSec: 0 },
    })
  } catch (e) {
    console.error('[wellbeing/pulse]', e)
    return NextResponse.json({ error: 'Failed to compute Pulse' }, { status: 500 })
  }
}
