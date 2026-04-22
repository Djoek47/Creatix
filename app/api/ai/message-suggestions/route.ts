import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  generateMessageSuggestionsWithGrok,
  generateMessageSuggestionsWithOpenAI,
  NormalizedChatMessage,
} from '@/lib/ai/message-suggestions'
import { runMimicMessageSuggestion } from '@/lib/ai/run-mimic-message-suggestion'
import { isPaidPlanId } from '@/lib/billing/access'
import { CREDITS_DIVINE_CHAT_MESSAGE } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'

type Mode = 'scan' | 'circe' | 'venus' | 'flirt' | 'mimic'

type RequestBody = {
  mode: Mode
  platform: 'onlyfans' | 'fansly'
  fan: { id: string | number; username?: string; name?: string }
  messages: NormalizedChatMessage[]
  tonePreferences?: string[]
  niches?: string[]
  boundaries?: string[]
  flirtControls?: {
    explicitnessLevel?: number
    inspirationKeywords?: string
  }
  creatorPronouns?: string
  creatorGenderIdentity?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as RequestBody

    if (!body || !body.mode || !body.platform || !body.fan || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const mode: Mode = body.mode
    if (!['scan', 'circe', 'venus', 'flirt', 'mimic'].includes(mode)) {
      return NextResponse.json({ error: 'Unsupported mode' }, { status: 400 })
    }

    // Short-circuit if there is no conversation history
    const messages = (body.messages || []).filter(
      (m) => m && typeof m.text === 'string' && m.text.trim().length > 0
    )
    if (messages.length === 0) {
      return NextResponse.json(
        { mode, model: null, insights: null, suggestions: [] },
        { status: 200 }
      )
    }

    // Check subscription for Pro / Grok access
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const rawPlanId = (subscription as any)?.plan_id as string | null | undefined
    const normalizedPlanId = rawPlanId?.toLowerCase() || null
    const isPro = !!normalizedPlanId && isPaidPlanId(normalizedPlanId)

    const xaiKey = process.env.XAI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!xaiKey && !openaiKey) {
      return NextResponse.json(
        { error: 'AI provider is not configured on the server' },
        { status: 503 },
      )
    }

    const gate = await hasEnoughAiCredits(supabase, user.id, CREDITS_DIVINE_CHAT_MESSAGE)
    if (!gate.ok) {
      return NextResponse.json(
        { error: 'Insufficient AI credits', code: 'ai_credits_exhausted', used: gate.used, limit: gate.limit },
        { status: 402 },
      )
    }

    if (mode === 'mimic') {
      if (body.platform !== 'onlyfans') {
        return NextResponse.json(
          { error: 'Mimic (beta) is currently available only for OnlyFans threads.' },
          { status: 400 },
        )
      }

      const mimicResult = await runMimicMessageSuggestion({
        supabase,
        userId: user.id,
        fanId: String(body.fan.id),
      })

      if (!mimicResult.ok) {
        return NextResponse.json({ error: mimicResult.error }, { status: 400 })
      }

      try {
        await consumeAiCredits(supabase, user.id, CREDITS_DIVINE_CHAT_MESSAGE)
      } catch {
        // ignore credit errors
      }

      return NextResponse.json({
        mode: 'mimic',
        model: 'openai',
        suggestions: mimicResult.suggestions,
        note: mimicResult.note,
      })
    }

    const nonMimicMode: Exclude<Mode, 'mimic'> = mode

    const ctx = {
      mode: nonMimicMode,
      platform: body.platform,
      fan: body.fan,
      messages,
      tonePreferences: body.tonePreferences,
      niches: body.niches,
      boundaries: body.boundaries,
      flirtControls: body.flirtControls,
      creatorPronouns: body.creatorPronouns,
      creatorGenderIdentity: body.creatorGenderIdentity,
      userId: user.id,
    }

    let result
    if (isPro && xaiKey) {
      // Pro users with Grok configured → prefer Grok
      result = await generateMessageSuggestionsWithGrok(xaiKey, ctx)
    } else if (openaiKey) {
      // Free or Pro without Grok but OpenAI is configured → use OpenAI
      result = await generateMessageSuggestionsWithOpenAI(ctx)
    } else {
      // Fallback: OpenAI not configured but Grok is – use Grok even for non‑Pro
      result = await generateMessageSuggestionsWithGrok(xaiKey!, ctx)
    }

    try {
      await consumeAiCredits(supabase, user.id, CREDITS_DIVINE_CHAT_MESSAGE)
    } catch {
      // ignore credit errors
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error generating message suggestions:', error)
    // Surface a bit more detail to help diagnose provider/env issues in production
    const message =
      typeof error?.message === 'string'
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to generate message suggestions',
        detail: message,
      },
      { status: 500 }
    )
  }
}

