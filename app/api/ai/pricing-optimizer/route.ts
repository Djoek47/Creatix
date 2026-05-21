import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { logUsageEvent } from '@/lib/usage/server-log'
import { isPaidPlanId } from '@/lib/billing/access'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
  shouldBillAiStreamFinish,
} from '@/lib/ai/assert-ai-tool-access'
import {
  formatCreatorOnlyFansPageModelForAi,
  parseOnlyFansCreatorPageModel,
} from '@/lib/onlyfans/creator-page-model'

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'pricing-optimizer')
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
    return new Response(JSON.stringify({ error: 'Pro subscription required for Pricing Optimizer' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { contentType, currentPrice, subscriberCount, engagementRate, niche } = await req.json()

  const { data: ofConn } = await supabase
    .from('platform_connections')
    .select('onlyfans_creator_page_model')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  const creatorPageHint = formatCreatorOnlyFansPageModelForAi(
    parseOnlyFansCreatorPageModel(
      (ofConn as { onlyfans_creator_page_model?: string | null } | null)?.onlyfans_creator_page_model,
    ),
  )

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    onFinish: async ({ totalUsage, finishReason }) => {
      try {
        logUsageEvent({
          userId,
          feature: 'api/ai/pricing-optimizer',
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
          console.error('[pricing-optimizer] Credit charge failed after stream', finishReason)
        }
      } catch (e) {
        console.error('[pricing-optimizer] onFinish error', e)
      }
    },
    system: `You are an expert pricing strategist for content creators. You analyze market data, engagement metrics, and audience behavior to recommend optimal pricing strategies that maximize both revenue and subscriber satisfaction.`,
    prompt: `Analyze pricing for this creator:
- Content Type: ${contentType || 'Premium content'}
- Current Price: $${currentPrice || 'Not set'}
- Subscriber Count: ${subscriberCount || 'Unknown'}
- Engagement Rate: ${engagementRate || 'Unknown'}%
- Niche: ${niche || 'General'}

Creator context (OnlyFans page model — use to choose PPV-first vs subscription-first advice):
${creatorPageHint}

Provide:
1. Optimal price recommendation with reasoning
2. Tiered pricing strategy (if applicable)
3. PPV pricing suggestions
4. Bundle/discount opportunities
5. Seasonal pricing recommendations
6. A/B testing suggestions

Format as actionable recommendations with expected impact on revenue.`,
  })

  return result.toTextStreamResponse()
}
