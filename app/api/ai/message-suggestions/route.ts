import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  generateMessageSuggestionsWithGrok,
  generateMessageSuggestionsWithOpenAI,
  NormalizedChatMessage,
} from '@/lib/ai/message-suggestions'
import { runMimicMessageSuggestion } from '@/lib/ai/run-mimic-message-suggestion'
import { isPaidPlanId } from '@/lib/billing/access'
import { getDivineVoicePremiumForUserId } from '@/lib/billing/premium-divine'
import { CREDITS_DIVINE_CHAT_MESSAGE } from '@/lib/billing/credit-economics'
import {
  consumeAiCredits,
  hasEnoughAiCredits,
  insufficientAiCreditsResponse,
} from '@/lib/billing/consume-ai-credits'
import {
  loadOnlyFansMessagingContext,
  updateOnlyFansSuggestionMemory,
} from '@/lib/divine/onlyfans-messaging-context'

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

    const clientMessages = (body.messages || []).filter(
      (m) => m && typeof m.text === 'string' && m.text.trim().length > 0
    )
    if (body.platform !== 'onlyfans' && clientMessages.length === 0) {
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
      return insufficientAiCreditsResponse(gate.used, gate.limit)
    }

    const requestId =
      req.headers.get('x-idempotency-key') ||
      req.headers.get('x-request-id') ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`

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

      const debit = await consumeAiCredits(supabase, user.id, CREDITS_DIVINE_CHAT_MESSAGE, {
        reasonCode: 'message_generation_light',
        reasonRef: `message_suggestions:mimic:${body.platform}:${body.fan.id}:${requestId}`,
        idempotencyKey: `message_suggestions:mimic:${user.id}:${body.fan.id}:${requestId}`,
        metadata: { endpoint: '/api/ai/message-suggestions', mode: 'mimic' },
      })
      if (!debit.ok) return insufficientAiCreditsResponse(debit.used, debit.limit)

      return NextResponse.json({
        mode: 'mimic',
        model: 'openai',
        suggestions: mimicResult.suggestions,
        note: mimicResult.note,
      })
    }

    const nonMimicMode: Exclude<Mode, 'mimic'> = mode

    let messages = clientMessages
    let fanForModel = body.fan
    let threadSupplement: string | undefined
    let fanCommerceContext: string | undefined
    let creatorPageContext: string | undefined
    let niches = body.niches
    let boundaries = body.boundaries

    if (body.platform === 'onlyfans') {
      const context = await loadOnlyFansMessagingContext(supabase, user.id, {
        fanId: String(body.fan.id),
        username: body.fan.username,
        name: body.fan.name,
      })
      if ('error' in context) {
        return NextResponse.json({ error: context.error }, { status: context.notFound ? 404 : 400 })
      }
      messages = context.messages
      fanForModel = context.fanForAi
      threadSupplement = context.threadSupplement
      fanCommerceContext = context.fanCommerceContext
      creatorPageContext = context.creatorPageContext
      niches = context.niches
      boundaries = context.boundaries
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { mode, model: null, insights: null, suggestions: [] },
        { status: 200 }
      )
    }

    const premiumOpenAi = await getDivineVoicePremiumForUserId(supabase, user.id)
    const ctx = {
      mode: nonMimicMode,
      platform: body.platform,
      fan: fanForModel,
      messages,
      tonePreferences: body.tonePreferences,
      niches,
      boundaries,
      flirtControls: body.flirtControls,
      creatorPronouns: body.creatorPronouns,
      creatorGenderIdentity: body.creatorGenderIdentity,
      threadSupplement,
      fanCommerceContext,
      creatorPageContext,
      userId: user.id,
      premiumOpenAi,
    }

    let result
    if (openaiKey) {
      result = await generateMessageSuggestionsWithOpenAI(ctx)
    } else if (isPro && xaiKey) {
      result = await generateMessageSuggestionsWithGrok(xaiKey, ctx)
    } else {
      result = await generateMessageSuggestionsWithGrok(xaiKey!, ctx)
    }

    const debit = await consumeAiCredits(supabase, user.id, CREDITS_DIVINE_CHAT_MESSAGE, {
      reasonCode: 'message_generation_light',
      reasonRef: `message_suggestions:${mode}:${body.platform}:${body.fan.id}:${requestId}`,
      idempotencyKey: `message_suggestions:${mode}:${user.id}:${body.fan.id}:${requestId}`,
      metadata: { endpoint: '/api/ai/message-suggestions', mode },
    })
    if (!debit.ok) return insufficientAiCreditsResponse(debit.used, debit.limit)
    if (body.platform === 'onlyfans') {
      await updateOnlyFansSuggestionMemory(supabase, user.id, String(body.fan.id), messages)
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

