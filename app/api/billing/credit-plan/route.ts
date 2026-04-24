import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { buildCreditPlan, type CreditPlanInput } from '@/lib/billing/credit-planner'
import { getCreditWalletState } from '@/lib/billing/credit-wallet'

type FocusMode = 'balanced' | 'premium'

function deriveCreatorSize(fanCount: number): CreditPlanInput['creatorSize'] {
  if (fanCount >= 2000) return 'agency'
  if (fanCount >= 600) return 'small_team'
  return 'solo'
}

function deriveTargets(args: {
  fanCount: number
  highValueFans: number
  monthlyRevenue: number
  focusMode: FocusMode
}): CreditPlanInput['targetActivityVolume'] {
  const { fanCount, highValueFans, monthlyRevenue, focusMode } = args
  const premiumBias = focusMode === 'premium' ? 1.15 : 1
  const activeFans = Math.max(60, Math.round(fanCount * 0.32))
  const revenueTierBoost = Math.min(2.4, 1 + monthlyRevenue / 30000)
  const highValueBoost = Math.min(1.8, 1 + highValueFans / 800)

  const dmcaScans = Math.max(
    4,
    Math.round((fanCount / 140 + monthlyRevenue / 3500 + highValueFans / 60) * premiumBias),
  )
  const reputationScans = Math.max(
    3,
    Math.round((fanCount / 190 + monthlyRevenue / 4500 + highValueFans / 90) * premiumBias),
  )
  const messages = Math.max(400, Math.round(activeFans * 7 * revenueTierBoost))
  const chatTurns = Math.max(260, Math.round(activeFans * 5.5 * highValueBoost))

  return {
    messages,
    leakScans: dmcaScans,
    reputationScans,
    chatTurns,
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as Partial<CreditPlanInput>
    const wallet = await getCreditWalletState(supabase, user.id)
    const focusMode: FocusMode = body.focusMode === 'balanced' ? 'balanced' : 'premium'

    const now = new Date()
    const from = new Date(now)
    from.setUTCDate(from.getUTCDate() - 30)
    const fromIso = from.toISOString()
    const [{ count: fansCount }, { count: highValueCount }, revenueRes] = await Promise.all([
      supabase
        .from('fans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('platform', ['onlyfans', 'fansly']),
      supabase
        .from('fans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('total_spent', 100),
      supabase
        .from('analytics_snapshots')
        .select('revenue')
        .eq('user_id', user.id)
        .gte('date', fromIso),
    ])
    const fanCount = Number(fansCount ?? 0)
    const highValueFans = Number(highValueCount ?? 0)
    const monthlyRevenue = (revenueRes.data ?? []).reduce(
      (sum, row) => sum + Number((row as { revenue?: number | null }).revenue ?? 0),
      0,
    )
    const autoTargets = deriveTargets({ fanCount, highValueFans, monthlyRevenue, focusMode })

    const input: CreditPlanInput = {
      monthlyCreditsAvailable: Number(body.monthlyCreditsAvailable ?? wallet.includedRemaining),
      purchasedCreditsAvailable: Number(body.purchasedCreditsAvailable ?? wallet.purchasedRemaining),
      creatorSize:
        body.creatorSize === 'agency' || body.creatorSize === 'small_team'
          ? body.creatorSize
          : deriveCreatorSize(fanCount),
      focusMode,
      priorities: Array.isArray(body.priorities)
        ? body.priorities.filter((p) =>
            ['dm_growth', 'dmca', 'reputation', 'chat_support'].includes(String(p)),
          ) as CreditPlanInput['priorities']
        : focusMode === 'premium'
          ? (['dmca', 'reputation', 'dm_growth'] as CreditPlanInput['priorities'])
          : (['dm_growth', 'chat_support'] as CreditPlanInput['priorities']),
      targetActivityVolume: {
        messages: Number(body.targetActivityVolume?.messages ?? autoTargets.messages ?? 0),
        leakScans: Number(body.targetActivityVolume?.leakScans ?? autoTargets.leakScans ?? 0),
        reputationScans: Number(
          body.targetActivityVolume?.reputationScans ?? autoTargets.reputationScans ?? 0,
        ),
        chatTurns: Number(body.targetActivityVolume?.chatTurns ?? autoTargets.chatTurns ?? 0),
      },
    }

    const plan = buildCreditPlan(input)
    return NextResponse.json({
      input,
      wallet,
      signals: {
        fanCount,
        highValueFans,
        monthlyRevenueUsd: Math.round(monthlyRevenue),
      },
      plan,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to build credit plan' }, { status: 500 })
  }
}
