import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { buildCreditPlan, type CreditPlanInput } from '@/lib/billing/credit-planner'
import { getCreditWalletState } from '@/lib/billing/credit-wallet'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as Partial<CreditPlanInput>
    const wallet = await getCreditWalletState(supabase, user.id)

    const input: CreditPlanInput = {
      monthlyCreditsAvailable: Number(body.monthlyCreditsAvailable ?? wallet.totalRemaining),
      creatorSize:
        body.creatorSize === 'agency' || body.creatorSize === 'small_team' ? body.creatorSize : 'solo',
      priorities: Array.isArray(body.priorities)
        ? body.priorities.filter((p) =>
            ['dm_growth', 'dmca', 'reputation', 'chat_support'].includes(String(p)),
          ) as CreditPlanInput['priorities']
        : [],
      targetActivityVolume: {
        messages: Number(body.targetActivityVolume?.messages ?? 0),
        leakScans: Number(body.targetActivityVolume?.leakScans ?? 0),
        reputationScans: Number(body.targetActivityVolume?.reputationScans ?? 0),
        chatTurns: Number(body.targetActivityVolume?.chatTurns ?? 0),
      },
    }

    const plan = buildCreditPlan(input)
    return NextResponse.json({ input, wallet, plan })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to build credit plan' }, { status: 500 })
  }
}
