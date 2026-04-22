import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { logUsageEvent } from '@/lib/usage/server-log'
import { isPaidPlanId } from '@/lib/billing/access'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
  shouldBillAiStreamFinish,
} from '@/lib/ai/assert-ai-tool-access'

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'mass-dm-composer')
  if (!access.ok) return access.response
  const { supabase, userId, cost } = access.data

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

  const { campaign, audienceSegment, tone, callToAction, personalizationFields } = await req.json()

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
        const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost)
        if (!charged.ok) {
          console.error('[mass-dm-composer] Credit charge failed after stream', finishReason)
        }
      } catch (e) {
        console.error('[mass-dm-composer] onFinish error', e)
      }
    },
    system: `You are an expert in crafting personalized mass messages for content creators. You create messages that feel personal and genuine while being efficient to send at scale. You understand platform best practices and avoid spam triggers.`,
    prompt: `Create a mass DM campaign:
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

Use placeholders like {name}, {tier}, {last_purchase} that can be replaced with real data.`,
  })

  return result.toDataStreamResponse()
}
