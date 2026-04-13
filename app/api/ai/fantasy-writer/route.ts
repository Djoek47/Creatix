import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'

export const maxDuration = 30

const fantasySchema = z.object({
  content: z.string().describe('The generated fantasy/roleplay story'),
  suggestions: z.array(z.string()).describe('Continuation suggestions'),
  mood: z.string().describe('The overall mood of the story'),
  messageIdeas: z.array(z.string()).describe('Short message teasers to send to fans'),
})

function sanitize(s: unknown, max = 12_000): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : ''
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const scenario = sanitize(body.scenario, 8000)
  const tone = sanitize(body.tone, 80) || 'romantic'
  const platform = sanitize(body.platform, 40) || 'onlyfans'

  const calendarEventSummary = sanitize(body.calendarEventSummary, 2000)
  const scheduledContentSummary = sanitize(body.scheduledContentSummary, 2000)
  const fanProfileSummary = sanitize(body.fanProfileSummary, 4000)

  const hasScenario = scenario.length > 0
  const hasContext =
    calendarEventSummary.length > 0 ||
    scheduledContentSummary.length > 0 ||
    fanProfileSummary.length > 0

  if (!hasScenario && !hasContext) {
    return Response.json(
      {
        error:
          'Add a scenario or theme, or pick a calendar event, a scheduled post, and/or a fan so we can tailor the fantasy.',
      },
      { status: 400 },
    )
  }

  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const fantasyCost = getCreditsForToolId('fantasy-writer')
  if (user) {
    const gate = await hasEnoughAiCredits(supabase, user.id, fantasyCost)
    if (!gate.ok) {
      return Response.json(
        { error: 'Insufficient AI credits', code: 'ai_credits_exhausted', used: gate.used, limit: gate.limit },
        { status: 402 },
      )
    }
  }

  const contextBlocks: string[] = []
  if (calendarEventSummary) {
    contextBlocks.push(`Calendar / cosmic event:\n${calendarEventSummary}`)
  }
  if (scheduledContentSummary) {
    contextBlocks.push(`Your content calendar (scheduled item):\n${scheduledContentSummary}`)
  }
  if (fanProfileSummary) {
    contextBlocks.push(`Fan-specific personalization (write as if this fan is the audience; do not use real legal names if only a username is given):\n${fanProfileSummary}`)
  }

  const systemPrompt = `You are a creative writer specializing in romantic and fantasy content for adult content creators on platforms like ${platform}.

Write engaging, tasteful roleplay scenarios and fantasy stories that:
1. Are suggestive but not explicit
2. Create emotional connection and intrigue
3. Can be used in DMs with fans
4. Match the requested tone: ${tone}
5. Build anticipation and desire

When calendar or scheduled-content context is provided, weave the mood, themes, and timing of those events into the fantasy naturally.
When fan profile context is provided, personalize voice, pacing, and fantasy beats to feel written *for that fan* (loyalty, spend level, notes) without being creepy or stalkerish.

Keep content sensual but classy - think romance novel, not explicit content.`

  const userParts: string[] = []
  if (scenario) {
    userParts.push(`Scenario / theme from the creator:\n${scenario}`)
  }
  if (contextBlocks.length > 0) {
    userParts.push(contextBlocks.join('\n\n'))
  }
  userParts.push(
    `Generate an engaging story opening that can be used in fan interactions, along with continuation suggestions and short message teasers. Platform: ${platform}.`,
  )

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: fantasySchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userParts.join('\n\n'),
      },
    ],
  })

  if (user) {
    try {
      await consumeAiCredits(supabase, user.id, fantasyCost)
    } catch {
      // ignore credit errors
    }
  }

  return Response.json(output)
}
