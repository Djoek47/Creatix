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
If asked about illegal content or non-consensual material, refuse and redirect to platform-safe editing.

## Executable edits (Markit in the browser)
When the user asks you to **produce** a concrete video output — teaser, trailer, highlight reel, compilation, rough cut, multi-part assembly from timestamps — you must do **both**:
1. Brief natural-language guidance (what you chose and why).
2. A **machine-readable plan** in a fenced code block so Markit can **trim and concatenate** segments with ffmpeg (same accuracy as manual cuts; timing is deterministic).

Use exactly this fence label and JSON shape (version 1):

\`\`\`markit-edit
{"version":1,"kind":"concat_segments","label":"optional-short-name","segments":[{"startSec":0,"endSec":12},{"startSec":90,"endSec":110,"source":"primary"}]}
\`\`\`

Rules for the JSON:
- \`version\` must be \`1\`. \`kind\` is usually \`concat_segments\` (default). Use \`side_by_side\` only to describe intent — Markit may not render it yet; say that if so.
- \`segments\`: ordered list of **[startSec, endSec)** windows in seconds (floats allowed). Each becomes a cut, then clips are **joined in order** (teaser / compilation).
- \`source\`: omit or \`"primary"\` for the main vault video. Use \`"secondary"\` **only** if the user has loaded a second angle (dual vault bridge). If they want two angles but only one file is available, explain and use primary-only segments or refuse until they provide a second bridge.
- Prefer **total output under ~3–5 minutes** for client performance unless the user insists; shorter for teasers (e.g. 15–60s).
- If duration is unknown, propose plausible **relative** segments (e.g. first 20s, middle hook) and state that the user should scrub the timeline to adjust numbers.

Do not put secrets or URLs inside the JSON. Never claim the file was rendered on a server unless a server pipeline exists — these plans run **in the user’s browser** after they click build.`

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
