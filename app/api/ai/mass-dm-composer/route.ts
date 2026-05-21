import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { logUsageEvent } from '@/lib/usage/server-log'
import { isPaidPlanId } from '@/lib/billing/access'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
  shouldBillAiStreamFinish,
} from '@/lib/ai/assert-ai-tool-access'
import { createOpenAiBackgroundJob } from '@/lib/openai/background-jobs'

const COMPOSER_SYSTEM = `You are an expert in crafting personalized mass messages for content creators. You create messages that feel personal and genuine while being efficient to send at scale. You understand platform best practices and avoid spam triggers.`

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'mass-dm-composer')
  if (!access.ok) return access.response
  const { supabase, userId, cost, billingToolId } = access.data

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .single()

  const planId = (subscription as { plan_id?: string | null } | null)?.plan_id
  const normalizedPlanId = planId?.toLowerCase() || null
  const isPro = Boolean(normalizedPlanId && isPaidPlanId(normalizedPlanId))
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'Pro subscription required for Mass DM Composer' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const campaign = typeof body?.campaign === 'string' ? body.campaign : undefined
  const audienceSegment = typeof body?.audienceSegment === 'string' ? body.audienceSegment : undefined
  const tone = typeof body?.tone === 'string' ? body.tone : undefined
  const callToAction = typeof body?.callToAction === 'string' ? body.callToAction : undefined
  const personalizationFields = typeof body?.personalizationFields === 'string' ? body.personalizationFields : undefined
  const wantsBackgroundJob = Boolean(
    body?.backgroundJob ||
      body?.background ||
      (typeof body?.mode === 'string' && body.mode === 'background'),
  )

  const userPrompt = `Create a mass DM campaign:
- Campaign Goal: ${campaign || 'General engagement'}
- Audience Segment: ${audienceSegment || 'All subscribers'}
- Desired Tone: ${tone || 'Friendly and personal'}
- Call to Action: ${callToAction || 'Engage with content'}
- Personalization Fields: ${personalizationFields || '{name}, {tier}'}

Generate:
1. Main message template with personalization placeholders
2. 3 subject line variations (if applicable)
3. 2 alternative message versions for A/B testing
4. Follow-up message for non-responders
5. Optimal send time recommendations
6. Expected response rate estimate
7. Tips for maximizing engagement

Use placeholders like {name}, {tier}, {last_purchase} that can be replaced with real data.`

  const webhookConfigured = Boolean(process.env.OPENAI_WEBHOOK_SECRET?.trim())
  if (wantsBackgroundJob && webhookConfigured) {
    const q = await createOpenAiBackgroundJob({
      userId,
      feature: 'mass_dm_composer',
      instructions: COMPOSER_SYSTEM,
      input: userPrompt,
      requestMetadata: {
        billing_credit_cost: cost,
        billing_tool_id: billingToolId || 'mass-dm-composer',
      },
    })
    if (!q.ok || !q.jobId) {
      return NextResponse.json(
        { error: q.error || 'failed to enqueue background composer' },
        { status: 502 },
      )
    }
    return NextResponse.json({
      pending: true,
      jobId: q.jobId,
      hint: 'Poll Background AI jobs in Divine Manager Preferences or ask Divine get_background_job.',
    })
  }

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    onFinish: async ({ totalUsage, finishReason }) => {
      try {
        logUsageEvent({
          userId,
          feature: 'api/ai/mass-dm-composer',
          provider: 'gateway',
          model: 'anthropic/claude-sonnet-4',
          usage: {
            inputTokens: totalUsage?.inputTokens,
            outputTokens: totalUsage?.outputTokens,
            totalTokens: totalUsage?.totalTokens,
          },
        })
        if (cost <= 0 || !shouldBillAiStreamFinish(finishReason)) return
        const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost, billingToolId)
        if (!charged.ok) {
          console.error('[mass-dm-composer] Credit charge failed after stream', finishReason)
        }
      } catch (e) {
        console.error('[mass-dm-composer] onFinish error', e)
      }
    },
    system: COMPOSER_SYSTEM,
    prompt: userPrompt,
  })

  return result.toTextStreamResponse()
}
