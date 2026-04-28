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
    return new Response(JSON.stringify({ error: 'Pro subscription required for Voice Clone' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const voiceCost = getCreditsForToolId('voice-cloning')
  const gate = await hasEnoughAiCredits(supabase, user.id, voiceCost)
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

  const { sampleText, targetTone, context } = await req.json()

  await consumeAiCredits(supabase, user.id, voiceCost)

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    system: `You are an advanced AI voice and writing style cloner. Analyze the provided sample text to understand:
- Vocabulary patterns and word choices
- Sentence structure and rhythm
- Tone and emotional quality
- Unique phrases or expressions
- Communication style (formal/casual, direct/indirect)

Then generate new content that authentically matches this voice while adapting to the requested context.`,
    prompt: `Sample text to clone voice from:
"${sampleText}"

Target tone/context: ${targetTone || 'Same as sample'}
Additional context: ${context || 'General content creation'}

Generate 3 different message variations in this exact voice style. Make them sound natural and authentic to the original voice.`,
  })

  return result.toTextStreamResponse()
}
