import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'
import {
  FANSLY_MASS_OTP_COOKIE,
  fanslyMassOtpCookieOptions,
  isFanslyMassOtpEnforced,
  mintFanslyMassOtpCookieValue,
} from '@/lib/fansly/mass-otp-cookie'

/**
 * POST — verify email OTP for an ApiFansly 2FA session.
 * @see https://docs.apifansly.com/api-reference/connect-fansly-account/verify-otp
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

    const body = (await request.json().catch(() => ({}))) as {
      sessionToken?: unknown
      code?: unknown
      mode?: unknown
    }
    const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken.trim() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const mode = typeof body.mode === 'number' && Number.isFinite(body.mode) ? body.mode : 1

    if (!sessionToken || !code) {
      return NextResponse.json({ error: 'sessionToken and code are required' }, { status: 400 })
    }

    const api = createFanslyAPI()
    const result = await api.verifyTwofaSession(accountId, { token: sessionToken, code, mode })

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Verification failed' },
        { status: 400 },
      )
    }

    const res = NextResponse.json({ success: true })
    if (isFanslyMassOtpEnforced()) {
      const token = mintFanslyMassOtpCookieValue(user.id)
      if (token) {
        res.cookies.set(FANSLY_MASS_OTP_COOKIE, token, fanslyMassOtpCookieOptions(900))
      }
    }
    return res
  } catch (error) {
    console.error('[fansly/twofa/verify-otp]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verify OTP failed' },
      { status: 500 },
    )
  }
}
