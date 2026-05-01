import { NextRequest, NextResponse } from 'next/server'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
} from '@/lib/ai/assert-ai-tool-access'
import { executePhotoEditIntent } from '@/lib/media/photo-edit-intent-core'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as {
    imageBase64?: string
    instruction?: string
  }
  const imageBase64 = typeof json.imageBase64 === 'string' ? json.imageBase64 : ''
  const instruction = typeof json.instruction === 'string' ? json.instruction : ''

  const access = await requireAiToolSessionAndCredits(req, 'photo-enhancer')
  if (!access.ok) return access.response

  const { supabase, userId, cost, billingToolId } = access.data

  const result = await executePhotoEditIntent({
    imageBase64,
    instruction,
    userId,
    supabase,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost, billingToolId)
  if (!charged.ok) return charged.response

  return NextResponse.json({
    ...result.data,
    creditsUsed: charged.usedAfter ?? result.data.creditsUsed,
  })
}
