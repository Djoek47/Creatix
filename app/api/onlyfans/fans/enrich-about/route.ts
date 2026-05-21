import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'
import { insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'
import { executeFanEnrichAbout } from '@/lib/divine/fan-enrich-about'

export const maxDuration = 60

/**
 * POST { fanId: platform_fan_id, force?: boolean }
 * Legacy path; always OnlyFans. Prefer POST /api/divine/fans/enrich-about with platform.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const body = (await req.json().catch(() => ({}))) as { fanId?: string; force?: boolean }
    const fanId = typeof body.fanId === 'string' ? body.fanId.trim() : ''
    const result = await executeFanEnrichAbout(supabase, user.id, {
      fanId,
      platform: 'onlyfans',
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
