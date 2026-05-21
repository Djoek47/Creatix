import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
} from '@/lib/ai/assert-ai-tool-access'
import { getBrandContext } from '@/lib/brand/get-brand-context'

export const maxDuration = 30

const lintSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(['on-brand', 'mixed', 'off-brand']),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  rewrite: z.string(),
})

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'brand-lint')
  if (!access.ok) return access.response

  const { supabase, userId, cost, billingToolId } = access.data
  const body = (await req.json().catch(() => ({}))) as { draft?: string; channel?: string }
  const draft = typeof body.draft === 'string' ? body.draft.trim() : ''
  const channel = typeof body.channel === 'string' ? body.channel : 'general'
  if (!draft) return Response.json({ error: 'Missing draft' }, { status: 400 })

  const ctx = await getBrandContext(supabase, userId)
  if (!ctx) return Response.json({ error: 'Brand profile not configured.' }, { status: 400 })

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({ schema: lintSchema }),
    system: `You score creator copy for brand consistency.
Return strict JSON matching the schema.
Brand compact context:
${ctx.compact}
`,
    messages: [
      {
        role: 'user',
        content: `Channel: ${channel}
Draft:
${draft}

Score this copy for brand fit and provide a better rewrite when needed.`,
      },
    ],
  })

  const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost, billingToolId)
  if (!charged.ok) return charged.response
  return Response.json(output)
}

