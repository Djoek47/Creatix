import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { loadAdultPlatformBillingContext, onlyFansBillingDenialToResponse } from '@/lib/billing/onlyfans-billing-gate'
import { clearOnlyFansDmMessageCacheForUser } from '@/lib/messages/of-dm-cache'

/** DB patch when OnlyFans session expires (align with POST /api/onlyfans/disconnect). */
export const ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE = {
  is_connected: false,
  access_token: null,
  observed_monthly_revenue_usd: null,
  observed_revenue_captured_at: null,
  observed_revenue_onlyfans_account_id: null,
} as const

export interface OnlyFansRouteContext {
  api: ReturnType<typeof createOnlyFansAPI>
  accountId: string
  userId: string
}

/**
 * Authenticated OnlyFans API for the current user (platform_connections.access_token = account id).
 */
export async function requireOnlyFansApi(
  supabase: SupabaseClient,
): Promise<{ ok: true; ctx: OnlyFansRouteContext } | { ok: false; response: NextResponse }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const billingCtx = await loadAdultPlatformBillingContext(supabase)
  if (!billingCtx) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!billingCtx.onlyfansAccessToken) {
    return { ok: false, response: NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 }) }
  }

  if (billingCtx.denial) {
    return { ok: false, response: onlyFansBillingDenialToResponse(billingCtx.denial) }
  }

  const api = createOnlyFansAPI()
  api.setAccountId(billingCtx.onlyfansAccessToken)
  return { ok: true, ctx: { api, accountId: billingCtx.onlyfansAccessToken, userId: user.id } }
}

/** Before OnlyFans routes that do not use requireOnlyFansApi. */
export async function onlyFansBillingGateResponse(supabase: SupabaseClient): Promise<NextResponse | null> {
  const billingCtx = await loadAdultPlatformBillingContext(supabase)
  if (!billingCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!billingCtx.onlyfansAccessToken) return null
  return billingCtx.denial ? onlyFansBillingDenialToResponse(billingCtx.denial) : null
}

/** Before Fansly data routes (same revenue-tier rules as OnlyFans, scoped per platform account). */
export async function fanslyBillingGateResponse(supabase: SupabaseClient): Promise<NextResponse | null> {
  const billingCtx = await loadAdultPlatformBillingContext(supabase)
  if (!billingCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!billingCtx.fanslyAccessToken) return null
  return billingCtx.denial ? onlyFansBillingDenialToResponse(billingCtx.denial) : null
}

/** When the request will touch OnlyFans and/or Fansly data — block if billing denies and at least one is connected. */
export async function adultPlatformBillingGateWhenEitherConnected(
  supabase: SupabaseClient,
): Promise<NextResponse | null> {
  const billingCtx = await loadAdultPlatformBillingContext(supabase)
  if (!billingCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!billingCtx.onlyfansAccessToken && !billingCtx.fanslyAccessToken) return null
  return billingCtx.denial ? onlyFansBillingDenialToResponse(billingCtx.denial) : null
}

export async function handleOnlyFansSessionError(
  supabase: SupabaseClient,
  err: unknown,
): Promise<NextResponse | null> {
  const message = err instanceof Error ? err.message : String(err)
  if (!message.includes('ONLYFANS_SESSION_EXPIRED')) return null
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('platform_connections')
        .update(ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE)
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
      await clearOnlyFansDmMessageCacheForUser(supabase, user.id)
    }
  } catch {
    // best-effort
  }
  return NextResponse.json(
    {
      error: 'OnlyFans session expired',
      code: 'ONLYFANS_SESSION_EXPIRED',
      message:
        'Your OnlyFans session with our data partner expired. Please reconnect OnlyFans from your dashboard.',
    },
    { status: 401 },
  )
}

export async function jsonOnlyFansError(supabase: SupabaseClient, err: unknown): Promise<NextResponse> {
  const session = await handleOnlyFansSessionError(supabase, err)
  if (session) return session
  return NextResponse.json(
    { error: err instanceof Error ? err.message : 'Request failed' },
    { status: 500 },
  )
}

/** Ensure team analytics payloads include the connected OnlyFans account id. */
export function withDefaultAccountIds(
  body: Record<string, unknown> | null | undefined,
  accountId: string,
): Record<string, unknown> {
  const o = body && typeof body === 'object' ? { ...body } : {}
  const ids = o.account_ids
  if (Array.isArray(ids) && ids.length > 0) return o
  o.account_ids = [accountId]
  return o
}
