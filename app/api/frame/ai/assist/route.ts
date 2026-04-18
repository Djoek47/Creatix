import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { verifyExportToken } from '@/lib/frame-vault-bridge'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'

export const maxDuration = 60

const FRAME_ASSIST_SYSTEM = `You are Creatix Frame Assist — an editing and pacing assistant for adult creators' video workflows.
You help with: cuts, scene suggestions, pacing, hooks, safe-for-platform captions, tagging for library organization, and when to use Ariadne Trace for per-recipient forensic marking.
Stay practical and respectful; do not describe explicit sexual acts in detail. Focus on editing, structure, and business outcomes.
If asked about illegal content or non-consensual material, refuse and redirect to platform-safe editing.`

/**
 * Frame (or dashboard) calls with:
 * - Session cookie (same-site), OR
 * - Header Authorization: Bearer <exportToken> from GET frame-session (ties request to vault content), OR
 * - Header Authorization: Bearer <Supabase access_token> (standalone Frame app on another origin).
 */
function getBillingSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => ({}))
  const messages = (body.messages ?? []) as UIMessage[]
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('authorization')
  let userId: string | null = null
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const p = verifyExportToken(token)
    if (p) userId = p.userId
    else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (url && anon) {
        const sb = createClient(url, anon)
        const { data } = await sb.auth.getUser(token)
        if (data.user?.id) userId = data.user.id
      }
    }
  }

  const supabase = await createRouteHandlerClient(req)
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const billing = getBillingSupabase()
  if (!billing) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cost = getCreditsForToolId('frame-ai-assist')
  const gate = await hasEnoughAiCredits(billing, userId, cost)
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

  await consumeAiCredits(billing, userId, cost)

  const result = streamText({
    model: gateway('openai/gpt-4o-mini'),
    system: FRAME_ASSIST_SYSTEM,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Frame AI assist failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
