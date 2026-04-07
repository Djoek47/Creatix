import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const maxDuration = 30

const creatorMoodSchema = z.object({
  moodSummary: z.string().describe('Short compassionate summary of how the creator seems to be doing'),
  primaryState: z
    .enum(['grounded', 'wired', 'tender', 'heavy', 'sparky', 'drained'])
    .describe('Single-word vibe for the check-in'),
  burnoutHint: z.string().describe('One sentence: gentle burnout or overload signal if any, else reassuring'),
  microActions: z.array(z.string()).min(3).max(3).describe('Three tiny actions in the next few minutes'),
  nextHourRitual: z.string().describe('One concrete ritual for the next hour to stay sustainable'),
})

async function bumpMoodCredit(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('ai_credits_used')
      .eq('user_id', user.id)
      .maybeSingle()
    if (subscription) {
      await supabase
        .from('subscriptions')
        .update({ ai_credits_used: (subscription.ai_credits_used || 0) + 1 })
        .eq('user_id', user.id)
    }
  } catch {
    // ignore
  }
}

/** Creator well-being check-in only (was part of removed Mood Detector AI Studio tool). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    energy?: number
    stress?: number
    focus?: number
    pickedEmojis?: string[]
    microStory?: string
    voiceNoteTranscript?: string
  }

  const energy = Math.min(5, Math.max(1, Number(body.energy) || 3))
  const stress = Math.min(5, Math.max(1, Number(body.stress) || 3))
  const focus = Math.min(5, Math.max(1, Number(body.focus) || 3))
  const emojis = Array.isArray(body.pickedEmojis) ? body.pickedEmojis.slice(0, 4).join(' ') : ''
  const story = typeof body.microStory === 'string' ? body.microStory.trim().slice(0, 500) : ''
  const voice = typeof body.voiceNoteTranscript === 'string' ? body.voiceNoteTranscript.trim().slice(0, 800) : ''

  const systemPrompt = `You support adult content creators' well-being (not clinical advice, not therapy).
You receive a playful self check-in (sliders + emoji picks + optional notes). Respond with warmth and practicality.
No fan upsell, no platform growth tips—only recovery, boundaries, and sustainable work rhythms.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({ schema: creatorMoodSchema }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Creator self check-in:
- Energy (1=low, 5=high): ${energy}
- Stress (1=calm, 5=high): ${stress}
- Focus (1=foggy, 5=sharp): ${focus}
- Emoji constellation (picked): ${emojis || '(none)'}
- Short note: ${story || '(none)'}
- Voice transcript snippet: ${voice || '(none)'}

Produce the structured well-being response.`,
      },
    ],
  })

  await bumpMoodCredit(req)
  return Response.json({ mode: 'creator_check_in' as const, ...output })
}
