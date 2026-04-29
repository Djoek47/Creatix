import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { CREDITS_AI_TAKEDOWN_GUIDE } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits, insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'
import {
  TAKEDOWN_AI_GUIDE_SYSTEM,
  buildTakedownGuideUserPrompt,
} from '@/lib/dmca/takedown-ai-guide-prompt'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const gate = await hasEnoughAiCredits(supabase, user.id, CREDITS_AI_TAKEDOWN_GUIDE)
    if (!gate.ok) return insufficientAiCreditsResponse(gate.used, gate.limit)

    const raw = await request.json().catch(() => ({}))
    const sourceUrl = typeof raw.sourceUrl === 'string' ? raw.sourceUrl.trim() : ''
    const notesRaw = raw.notes
    let notes: string | null | undefined =
      typeof notesRaw === 'string' ? notesRaw : notesRaw === null ? null : undefined

    if (!sourceUrl) return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
    try {
      new URL(sourceUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid source URL' }, { status: 400 })
    }

    if (notes && notes.length > 8000) notes = notes.slice(0, 8000)

    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: TAKEDOWN_AI_GUIDE_SYSTEM,
      prompt: buildTakedownGuideUserPrompt({
        sourceUrl,
        notesSnippet: notes ?? null,
      }),
      temperature: 0.38,
      maxOutputTokens: 6000,
    })

    const guide = (text ?? '').trim()
    if (!guide) {
      return NextResponse.json({ error: 'Guide could not be generated' }, { status: 503 })
    }

    const consumed = await consumeAiCredits(supabase, user.id, CREDITS_AI_TAKEDOWN_GUIDE, {
      reasonCode: 'dmca_ai_takedown_guide',
      reasonRef: `dmca-ai-guide:${user.id}:${crypto.randomUUID()}`,
    })
    if (!consumed.ok) return insufficientAiCreditsResponse(consumed.used, consumed.limit)

    return NextResponse.json({ guide })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[takedown-ai-guide]', e)
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 })
  }
}
