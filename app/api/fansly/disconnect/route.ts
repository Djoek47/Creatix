import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { notifyPlatformConnectionChange } from '@/lib/notifications/platform-connection-notify'

/**
 * POST — clear local Fansly integration (no upstream revoke available in our client).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_username')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection) {
      return NextResponse.json({ error: 'No Fansly connection found' }, { status: 400 })
    }

    const { error: dbError } = await supabase
      .from('platform_connections')
      .update({
        is_connected: false,
        access_token: null,
        platform_user_id: null,
        last_sync_at: new Date().toISOString(),
        observed_monthly_revenue_usd: null,
        observed_revenue_captured_at: null,
        observed_revenue_onlyfans_account_id: null,
      })
      .eq('user_id', user.id)
      .eq('platform', 'fansly')

    if (dbError) {
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 })
    }

    if (user.email) {
      void notifyPlatformConnectionChange({
        supabase,
        userId: user.id,
        userEmail: user.email,
        platform: 'fansly',
        event: 'disconnected',
        platformUsername: connection.platform_username ?? null,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Fansly account disconnected successfully',
    })
  } catch (error) {
    console.error('[fansly/disconnect]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Disconnect failed' },
      { status: 500 },
    )
  }
}
