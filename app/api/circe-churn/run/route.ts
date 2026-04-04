import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  defaultCirceChurnSettings,
  runCirceChurnForUser,
  type CirceChurnSettingsRow,
} from '@/lib/circe-churn/run-for-user'
import { isPaidSubscription } from '@/lib/billing/access'

/**
 * Manual "scan now" for Churn Predictor batch digest (same rules as scheduled runs, bypasses cadence).
 */
export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!isPaidSubscription(sub as { plan_id?: string | null; status?: string | null } | null)) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
  }

  const { data: churnRow, error: churnErr } = await supabase
    .from('circe_churn_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (churnErr) {
    console.error('[circe-churn run]', churnErr)
    return NextResponse.json({ error: churnErr.message }, { status: 500 })
  }

  const settings: CirceChurnSettingsRow = churnRow
    ? { ...(churnRow as CirceChurnSettingsRow), user_id: user.id }
    : defaultCirceChurnSettings(user.id)

  const out = await runCirceChurnForUser(supabase, settings, { force: true })

  if (out.skippedReason === 'no_credits') {
    return NextResponse.json({ error: 'Insufficient AI credits', result: out }, { status: 402 })
  }

  const { data: fresh } = await supabase.from('circe_churn_settings').select('*').eq('user_id', user.id).maybeSingle()

  return NextResponse.json({
    result: out,
    settings: fresh ?? settings,
  })
}
