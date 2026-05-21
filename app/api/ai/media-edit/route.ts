import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { applySafePhotoEdit } from '@/lib/media/apply-safe-photo-edit'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { ledgerDebitOptsForBillingTool } from '@/lib/billing/credit-reason-label'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'

export const maxDuration = 60

const bodySchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('blur'),
    imageBase64: z.string().min(20),
    sigma: z.number().min(0.3).max(40).optional(),
  }),
  z.object({
    operation: z.literal('lighting'),
    imageBase64: z.string().min(20),
    brightness: z.number().min(0.65).max(1.35).optional(),
  }),
  z.object({
    operation: z.literal('emoji'),
    imageBase64: z.string().min(20),
    emoji: z.string().min(1).max(8),
    xPercent: z.number().min(0).max(100),
    yPercent: z.number().min(0).max(100),
    sizePercent: z.number().min(3).max(40).optional(),
  }),
])

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data

  const photoCost = getCreditsForToolId('photo-enhancer')
  const gate = await hasEnoughAiCredits(supabase, user.id, photoCost)
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'AI credits exhausted', code: 'ai_credits_exhausted', used: gate.used, limit: gate.limit },
      { status: 402 },
    )
  }

  const result = await applySafePhotoEdit(body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const consumed = await consumeAiCredits(supabase, user.id, photoCost, ledgerDebitOptsForBillingTool('photo-enhancer'))
  if (!consumed.ok) {
    return NextResponse.json(
      {
        error: 'AI credits exhausted',
        code: 'ai_credits_exhausted',
        used: consumed.used,
        limit: consumed.limit,
      },
      { status: 402 },
    )
  }

  return NextResponse.json({
    imageBase64: result.imageBase64,
    operation: body.operation,
    creditsUsed: consumed.usedAfter,
  })
}
