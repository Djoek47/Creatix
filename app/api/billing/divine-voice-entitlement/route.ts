import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { hasDivineVoicePremium, type SubscriptionRowForPremiumDivine } from '@/lib/billing/premium-divine'

/** Lightweight read so the Divine launcher can sync after checkout without a full reload. */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('plan_id,status,divine_voice_premium')
      .eq('user_id', user.id)
      .maybeSingle()
    const divineVoicePremium = hasDivineVoicePremium(subRow as SubscriptionRowForPremiumDivine | null)
    return NextResponse.json({ divineVoicePremium })
  } catch {
    return NextResponse.json({ error: 'Failed to load entitlement' }, { status: 500 })
  }
}
