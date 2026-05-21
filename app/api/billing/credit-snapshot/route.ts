import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { effectiveMonthlyCreditLimit } from '@/lib/billing/credit-economics'
import { getCreditWalletState } from '@/lib/billing/credit-wallet'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [{ data: subscription }, wallet] = await Promise.all([
      supabase
        .from('subscriptions')
        .select(
          'plan_id,status,ai_credits_used,ai_credits_limit,billing_variant,revenue_tier,billing_focus_platform,billing_focus_platforms,billing_seats',
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      getCreditWalletState(supabase, user.id),
    ])

    const row = (subscription ?? {}) as {
      plan_id?: string | null
      status?: string | null
      ai_credits_used?: number | null
      ai_credits_limit?: number | null
      billing_variant?: string | null
      revenue_tier?: number | null
      billing_focus_platform?: string | null
      billing_focus_platforms?: string[] | null
      billing_seats?: number | null
    }

    const aiCreditsUsed = Number(row.ai_credits_used ?? 0)
    const status = String(row.status ?? '').toLowerCase()
    const canUseIncludedCredits = status === 'active' || status === 'trialing'
    const aiCreditsLimitEffective = canUseIncludedCredits
      ? effectiveMonthlyCreditLimit({
      plan_id: row.plan_id,
      billing_variant: row.billing_variant,
      revenue_tier: row.revenue_tier,
      billing_focus_platform: row.billing_focus_platform,
      billing_focus_platforms: row.billing_focus_platforms,
      billing_seats: row.billing_seats,
      ai_credits_limit: row.ai_credits_limit,
        })
      : 0

    return NextResponse.json({
      wallet,
      aiCreditsUsed,
      aiCreditsLimitEffective,
      aiCreditsRemainingLegacy: Math.max(0, aiCreditsLimitEffective - aiCreditsUsed),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load credit snapshot' }, { status: 500 })
  }
}
