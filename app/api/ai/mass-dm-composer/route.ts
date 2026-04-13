import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { isPaidPlanId } from '@/lib/billing/access'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check subscription for Pro access
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .single()

  const planId = (subscription as any)?.plan_id as string | null | undefined
  const normalizedPlanId = planId?.toLowerCase() || null
  const isPro = Boolean(normalizedPlanId && isPaidPlanId(normalizedPlanId))
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'Pro subscription required for Mass DM Composer' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const massCost = getCreditsForToolId('mass-dm-composer')
  const gate = await hasEnoughAiCredits(supabase, user.id, massCost)
  if (!gate.ok) {
    return new Response(
      JSON.stringify({
        error: 'Insufficient AI credits',
        code: 'ai_credits_exhausted',
        used: gate.used,
        limit: gate.limit,
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { campaign, audienceSegment, tone, callToAction, personalizationFields } = await req.json()

  await consumeAiCredits(supabase, user.id, massCost)

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
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
