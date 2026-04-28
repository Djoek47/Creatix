import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { gatherFlowActivitySignals } from '@/lib/wellbeing/flow-activity-signals'
import {
  flowStateResponseSchema,
  heuristicFlowState,
  type FlowStatePayload,
} from '@/lib/wellbeing/flow-state-ai'

export const maxDuration = 45

function compositePressureFromSignals(signals: Awaited<ReturnType<typeof gatherFlowActivitySignals>>) {
  const workDebt = Math.min(
    100,
    signals.protocolOpen * 6 + signals.managerSuggested * 4 + signals.managerScheduled * 3,
  )
  return Math.min(100, signals.messagePressure * 0.62 + workDebt * 0.38)
}

function buildPrompt(
  signals: Awaited<ReturnType<typeof gatherFlowActivitySignals>>,
  glowScore: number,
  minutesUntilGolden: number | null,
  compositePressure: number,
) {
  return `You estimate a creator's current mental load for a private wellbeing panel. Use ONLY the facts below; do not invent data.

Activity (synced workspace + inbox model):
- Message pressure index (model from unread + last-message tone + boundary lexicon): ${signals.messagePressure}/100
- Composite load index (inbox + protocol/manager backlog): ${Math.round(compositePressure)}/100
- Unread threads total: ${signals.inboxUnreadTotal}
- Threads active in last 24h: ${signals.activeThreads24h}
- Open protocol tasks (pending/executing): ${signals.protocolOpen}
- Divine Manager suggested tasks: ${signals.managerSuggested}
- Divine Manager scheduled tasks: ${signals.managerScheduled}
- Stated business goals: ${signals.goalsText}

Environmental:
- Glow score (conditions favoring creative work): ${glowScore}/100
- Minutes until next golden hour (or unknown): ${minutesUntilGolden == null ? 'unknown' : minutesUntilGolden}

Interpret strain **relative to goals**: ambitious goals + large queues ⇒ higher stress even when the creator is productive. Low backlog + strong glow ⇒ calmer readout.

Return mood, energy, stress, focus, rationale, goalAlignment. stress=100 means highly strained.`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const glowScore = typeof body.glowScore === 'number' && Number.isFinite(body.glowScore) ? body.glowScore : 52
    const minutesUntilGolden =
      typeof body.minutesUntilGolden === 'number' && Number.isFinite(body.minutesUntilGolden)
        ? body.minutesUntilGolden
        : null

    const signals = await gatherFlowActivitySignals(supabase, user.id)
    const compositePressure = compositePressureFromSignals(signals)

    const fallback = (): FlowStatePayload =>
      heuristicFlowState({
        signals,
        glowScore,
        minutesUntilGolden,
        compositePressure,
      })

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(fallback())
    }

    try {
      const { object } = await generateObject({
        model: 'openai/gpt-4o-mini',
        schema: flowStateResponseSchema,
        system:
          'You are a calm occupational wellbeing model for independent creators. Output only structured fields. No medical or diagnostic claims. No therapy role. Be concise.',
        prompt: buildPrompt(signals, glowScore, minutesUntilGolden, compositePressure),
      })

      const payload: FlowStatePayload = {
        ...object,
        messagePressure: Math.round(compositePressure),
        source: 'ai',
      }
      return NextResponse.json(payload)
    } catch {
      return NextResponse.json(fallback())
    }
  } catch (e) {
    console.error('[wellbeing/flow-state]', e)
    return NextResponse.json({ error: 'Failed to compute flow state' }, { status: 500 })
  }
}
