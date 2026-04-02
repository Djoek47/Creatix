import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { applySafePhotoEdit } from '@/lib/media/apply-safe-photo-edit'

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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('ai_credits_used, ai_credits_limit')
    .eq('user_id', user.id)
    .maybeSingle()

  const used = (subscription as { ai_credits_used?: number } | null)?.ai_credits_used ?? 0
  const limit = (subscription as { ai_credits_limit?: number } | null)?.ai_credits_limit ?? 100
  if (limit < 999999 && used >= limit) {
    return NextResponse.json({ error: 'AI credits exhausted' }, { status: 402 })
  }

  const result = await applySafePhotoEdit(body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (limit < 999999) {
    await supabase
      .from('subscriptions')
      .update({ ai_credits_used: used + 1 })
      .eq('user_id', user.id)
  }

  return NextResponse.json({
    imageBase64: result.imageBase64,
    operation: body.operation,
    creditsUsed: limit < 999999 ? used + 1 : used,
  })
}
