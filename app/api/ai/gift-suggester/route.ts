import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'

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
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = (await req.json().catch(() => ({}))) as {
    fanInfo?: string
    budget?: string
    useWishlist?: boolean
  }
  const fanInfo = typeof body.fanInfo === 'string' ? body.fanInfo : ''
  const budget = typeof body.budget === 'string' ? body.budget : ''
  const useWishlist = body.useWishlist === true

  const giftCost = getCreditsForToolId('gift-suggester')
  if (user) {
    const gate = await hasEnoughAiCredits(supabase, user.id, giftCost)
    if (!gate.ok) {
      return Response.json(
        { error: 'Insufficient AI credits', code: 'ai_credits_exhausted', used: gate.used, limit: gate.limit },
        { status: 402 },
      )
    }
  }

  let wishlistSection = ''
  if (useWishlist && user) {
    const { data: items } = await supabase
      .from('creator_gift_wishlist_items')
      .select('title, description, url, price_amount, price_currency')
      .eq('user_id', user.id)
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

  const { output } = await generateText({
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

  if (user) {
    try {
      await consumeAiCredits(supabase, user.id, giftCost)
    } catch {
      // ignore credit errors
    }
  }

  return Response.json(output)
}
