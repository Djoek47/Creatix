import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { refreshFanslyObservedRevenueForBilling } from '@/lib/fansly/billing-observation'
import { adultPlatformConnectBlockedByFocusPlan } from '@/lib/billing/platform-variant'
import { canConnectAdultPartnerPlatform } from '@/lib/billing/access'
import { logPartnerConnectEntitlementDenied } from '@/lib/billing/partner-connect-denial-log'
import { denialForAdultPlatformConnectEntitlement } from '@/lib/billing/onlyfans-billing-gate'
import { notifyPlatformConnectionChange } from '@/lib/notifications/platform-connection-notify'

// POST: Connect Fansly account with username/password
// Handles initial connection and 2FA verification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent double authentication: reject if already connected
    const { data: existing } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        {
          error: 'Fansly is already connected for this account. Disconnect in Settings to link a different account.',
          code: 'ALREADY_CONNECTED',
        },
        { status: 409 }
      )
    }

    const [{ data: subRow }, { data: connRows }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('plan_id,status,billing_variant,billing_focus_platform,billing_focus_platforms')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('platform_connections')
        .select('platform, is_connected')
        .eq('user_id', user.id),
    ])

    if (adultPlatformConnectBlockedByFocusPlan(connRows || [], subRow, 'fansly')) {
      return NextResponse.json(
        {
          error:
            'Your current plan is Focus for OnlyFans only. Upgrade to Unified (priced by your revenue tier) under Billing to connect Fansly.',
          code: 'BILLING_FOCUS_UPGRADE_REQUIRED',
        },
        { status: 403 },
      )
    }

    if (!canConnectAdultPartnerPlatform(subRow)) {
      logPartnerConnectEntitlementDenied('POST /api/fansly/auth', user.id)
      const denial = denialForAdultPlatformConnectEntitlement(subRow)
      return NextResponse.json(
        {
          error: denial?.message ?? 'Subscription or Divine trial required before connecting platforms.',
          code: 'CONNECT_ENTITLEMENT_REQUIRED',
          reason: 'CONNECT_ENTITLEMENT_REQUIRED',
        },
        { status: 403 },
      )
    }

    const apiKey = process.env.FANSLY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Fansly API not configured. Please contact support.' 
      }, { status: 500 })
    }

    const body = await request.json()
    const { username, password, twoFactorToken, twoFactorCode, countryCode = 'US' } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const api = createFanslyAPI()

    // If 2FA token and code provided, verify 2FA
    if (twoFactorToken && twoFactorCode) {
      const result = await api.submit2FA(
        username,
        password,
        twoFactorToken,
        twoFactorCode,
        `CreatorCRM - ${user.email}`,
        countryCode
      )

      if (result.success && result.account_id) {
        // Store connection in database
        await supabase
          .from('platform_connections')
          .upsert({
            user_id: user.id,
            platform: 'fansly',
            platform_user_id: result.account_id,
            platform_username: username.split('@')[0], // Use email prefix as username
            is_connected: true,
            access_token: result.account_id,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,platform'
          })

        await refreshFanslyObservedRevenueForBilling(supabase, user.id)

        const flUser = username.split('@')[0]
        if (user.email) {
          void notifyPlatformConnectionChange({
            supabase,
            userId: user.id,
            userEmail: user.email,
            platform: 'fansly',
            event: 'connected',
            platformUsername: flUser,
          })
        }

        return NextResponse.json({ 
          success: true, 
          accountId: result.account_id,
          username: username.split('@')[0]
        })
      }

      return NextResponse.json({ 
        error: result.message || '2FA verification failed' 
      }, { status: 400 })
    }

    // Initial connection attempt
    const result = await api.connectAccount(
      username,
      password,
      countryCode,
      `Creatix · ${(user.email ?? user.id).slice(0, 80)}`,
    )

    // If 2FA required, return the token
    if (result.requires_2fa && result.twoFactorToken) {
      return NextResponse.json({
        requires_2fa: true,
        twoFactorToken: result.twoFactorToken,
        masked_email: result.masked_email,
        message: result.message || 'Please enter the 2FA code sent to your email'
      })
    }

    // If connection successful
    if (result.success && result.account_id) {
      const { data: existingFs } = await supabase
        .from('platform_connections')
        .select('access_token, platform_user_id')
        .eq('user_id', user.id)
        .eq('platform', 'fansly')
        .maybeSingle()

      const prevId = existingFs?.access_token ?? existingFs?.platform_user_id
      const sameFanslyAccount =
        prevId != null && String(prevId) === String(result.account_id)
      const observedReset = sameFanslyAccount
        ? {}
        : {
            observed_monthly_revenue_usd: null,
            observed_revenue_captured_at: null,
            observed_revenue_onlyfans_account_id: null,
          }

      // Store connection in database
      await supabase
        .from('platform_connections')
        .upsert(
          {
            user_id: user.id,
            platform: 'fansly',
            platform_user_id: result.account_id,
            platform_username: username.split('@')[0],
            is_connected: true,
            access_token: result.account_id,
            last_sync_at: new Date().toISOString(),
            ...observedReset,
          },
          {
            onConflict: 'user_id,platform',
          },
        )

      await refreshFanslyObservedRevenueForBilling(supabase, user.id)

      const flUser = username.split('@')[0]
      if (user.email && !sameFanslyAccount) {
        void notifyPlatformConnectionChange({
          supabase,
          userId: user.id,
          userEmail: user.email,
          platform: 'fansly',
          event: 'connected',
          platformUsername: flUser,
        })
      }

      return NextResponse.json({ 
        success: true, 
        accountId: result.account_id,
        username: username.split('@')[0]
      })
    }

    return NextResponse.json({ 
      error: result.message || 'Connection failed' 
    }, { status: 400 })

  } catch (error) {
    console.error('Fansly auth error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    
    // User-friendly error messages
    if (errorMessage.includes('Account limit reached')) {
      return NextResponse.json({
        error: 'Service temporarily at capacity. Please try again later or contact support.'
      }, { status: 503 })
    }
    
    if (errorMessage.includes('Invalid') || errorMessage.includes('incorrect')) {
      return NextResponse.json({
        error: 'Invalid email or password. Please check your credentials.'
      }, { status: 401 })
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
