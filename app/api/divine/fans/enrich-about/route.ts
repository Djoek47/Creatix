import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { onlyFansBillingGateResponse, fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'
import { insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'
import { executeFanEnrichAbout, type FanEnrichPlatform } from '@/lib/divine/fan-enrich-about'

export const maxDuration = 60

/**
 * POST { fanId, platform?: 'onlyfans' | 'fansly', force?: boolean }
 * Web bio + fellow-creator signal (Serper + LLM); same behavior as legacy /api/onlyfans/fans/enrich-about.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      fanId?: string
      force?: boolean
      platform?: string
    }
    const platform: FanEnrichPlatform = body.platform === 'fansly' ? 'fansly' : 'onlyfans'

    const billingBlock =
      platform === 'fansly'
        ? await fanslyBillingGateResponse(supabase)
        : await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const fanId = typeof body.fanId === 'string' ? body.fanId.trim() : ''
    const result = await executeFanEnrichAbout(supabase, user.id, {
      fanId,
      platform,
      force: body.force === true,
    })

    if (result.kind === 'credits') {
      return insufficientAiCreditsResponse(result.used, result.limit)
    }
    return NextResponse.json(result.body, { status: result.status })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Enrich failed' },
      { status: 500 },
    )
  }
}
