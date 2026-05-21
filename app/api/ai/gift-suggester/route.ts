import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
} from '@/lib/ai/assert-ai-tool-access'

export const maxDuration = 30

const giftSchema = z.object({
  content: z.string().describe('Gift strategy summary'),
  suggestions: z.array(
    z.object({
      gift: z.string().describe('Gift or reward suggestion'),
      reason: z.string().describe('Why this would work'),
      cost: z.string().describe('Estimated cost or effort'),
      impact: z.enum(['high', 'medium', 'low']).describe('Expected impact on relationship'),
    }),
  ).describe('Gift suggestions'),
  personalizedMessages: z.array(z.string()).describe('Personalized messages to send with gifts'),
  timingTips: z.array(z.string()).describe('Best times to send gifts'),
  retentionStrategy: z.string().describe('Long-term retention strategy for this fan'),
})

function formatWishlistForPrompt(
  rows: Array<{
    title: string | null
    description: string | null
    url: string
    price_amount: number | null
    price_currency: string | null
  }>,
): string {
  if (!rows.length) return ''
  return rows
    .map((r) => {
      const title = r.title?.trim() || r.url
      const price =
        r.price_amount != null
          ? ` (${r.price_amount} ${r.price_currency || 'USD'})`
          : ''
      const desc = r.description?.trim() ? ` — ${r.description.trim().slice(0, 200)}` : ''
      return `- ${title}${price}${desc}\n  Link: ${r.url}`
    })
    .join('\n')
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    fanInfo?: string
    budget?: string
    useWishlist?: boolean
  }
  const fanInfo = typeof body.fanInfo === 'string' ? body.fanInfo : ''
  const budget = typeof body.budget === 'string' ? body.budget : ''
  const useWishlist = body.useWishlist === true

  const access = await requireAiToolSessionAndCredits(req, 'gift-suggester')
  if (!access.ok) return access.response

  const { supabase, userId, cost, billingToolId } = access.data

  let wishlistSection = ''
  if (useWishlist) {
    const { data: items } = await supabase
      .from('creator_gift_wishlist_items')
      .select('title, description, url, price_amount, price_currency')
      .eq('user_id', userId)
      .eq('fetch_status', 'ok')
      .order('updated_at', { ascending: false })
      .limit(30)

    const block = formatWishlistForPrompt(
      (items ?? []) as {
        title: string | null
        description: string | null
        url: string
        price_amount: number | null
        price_currency: string | null
      }[],
    )
    if (block) {
      wishlistSection = `

The creator saved these real product / treat ideas (prefer suggesting from this list when they fit the fan and budget; mention approximate price when known):

${block}
`
    }
  }

  const systemPrompt = `You are an expert at fan relationship management for content creators.

Suggest personalized gifts and rewards that:
1. Show appreciation
2. Strengthen the relationship
3. Encourage continued support
4. Match the fan's apparent interests
5. Are appropriate for the budget

Focus on digital gifts, personalized content, and meaningful gestures.
When a saved wishlist is provided, prioritize concrete items from it when they fit; otherwise suggest appropriate alternatives.`

  let output: z.infer<typeof giftSchema>
  try {
    const gen = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: giftSchema,
      }),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Suggest gifts and rewards for this fan:

Fan info: ${fanInfo || 'Top supporter'}
Budget/tier: ${budget || 'Any'}
${wishlistSection}

Provide personalized suggestions that will strengthen the relationship.`,
        },
      ],
    })
    output = gen.output
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gift suggester failed'
    return Response.json({ error: message }, { status: 500 })
  }

  const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost, billingToolId)
  if (!charged.ok) return charged.response

  return Response.json(output)
}
