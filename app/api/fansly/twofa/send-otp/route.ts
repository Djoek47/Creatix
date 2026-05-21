import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

/**
 * POST — start ApiFansly email 2FA session for the connected Fansly account (sensitive actions).
 * @see https://docs.apifansly.com/api-reference/connect-fansly-account/send-otp
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await fanslyBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    const accountId =
      (connection?.access_token != null && String(connection.access_token).trim() !== ''
        ? String(connection.access_token).trim()
        : null) ??
      (connection?.platform_user_id != null && String(connection.platform_user_id).trim() !== ''
        ? String(connection.platform_user_id).trim()
        : null)

    if (!accountId) {
      return NextResponse.json({ error: 'Fansly not connected' }, { status: 400 })
    }

    let useEmailTwoFAFallback = true
    try {
      const body = await request.json().catch(() => ({}))
      if (body && typeof body === 'object' && 'useEmailTwoFAFallback' in body) {
        useEmailTwoFAFallback = Boolean((body as { useEmailTwoFAFallback?: unknown }).useEmailTwoFAFallback)
      }
    } catch {
      /* empty body */
    }

    const api = createFanslyAPI()
    const result = await api.startTwofaEmailSession(accountId, useEmailTwoFAFallback)

    if (!result.success || !result.emailTwofa?.token) {
      return NextResponse.json(
        { error: result.message || 'Could not start Fansly email verification' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      sessionToken: result.emailTwofa.token,
      maskedEmail: result.emailTwofa.email || '',
    })
  } catch (error) {
    console.error('[fansly/twofa/send-otp]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send OTP failed' },
      { status: 500 },
    )
  }
}
