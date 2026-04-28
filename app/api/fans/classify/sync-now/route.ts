import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import type { FanClassifyConfig } from '@/lib/divine-manager'
import { syncFanClassifyForUser } from '@/lib/fan-classify/sync-core'
import { adultPlatformBillingGateWhenEitherConnected } from '@/lib/onlyfans-api-route'

export const maxDuration = 120

/**
 * POST — run Smart classify now (subscription + spend segments from CRM → OnlyFans lists / Fansly tags).
 * Same logic as cron housekeeping-fan-lists, scoped to the signed-in user.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
    if (billingBlock) return billingBlock

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('housekeeping_lists')
      .eq('user_id', user.id)
      .maybeSingle()

    const config = (settings?.housekeeping_lists ?? {}) as FanClassifyConfig
    if (!config.enabled) {
      return NextResponse.json(
        {
          error: 'Smart lists are off',
          code: 'CLASSIFY_DISABLED',
          message:
            'Turn on automatic smart lists under Fans → Arrangements, then run classification again.',
        },
        { status: 422 },
      )
    }

    const { data: ofConn } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    const onlyfansAccessToken = ofConn?.access_token ? String(ofConn.access_token) : null

    const out = await syncFanClassifyForUser(supabase, user.id, config, { onlyfansAccessToken })

    if (!out.ok) {
      return NextResponse.json(
        { error: out.error ?? 'Sync failed', details: out.details },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, details: out.details })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
