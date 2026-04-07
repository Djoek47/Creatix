import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { isPaidPlanId, PAID_PLAN_ID } from '@/lib/billing/access'
import {
  computeRequiredRevenueTierFromScopedObservations,
  scopedObservationFromFanslyRow,
  scopedObservationFromOnlyFansRow,
  type PlatformConnectionObservedRow,
} from '@/lib/billing/onlyfans-billing-gate'
import { DEFAULT_BILLING_SEATS, MAX_BILLING_SEATS } from '@/lib/billing/seats'
import { sortFocusPlatforms, type AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { getMonthlyPriceCents, getTierByIndex, type BillingVariant } from '@/lib/pricing-matrix'

export const maxDuration = 300

type ConnRow = {
  user_id: string
  platform: string
  access_token?: string | null
  platform_user_id?: string | null
  observed_monthly_revenue_usd?: number | null
  observed_revenue_captured_at?: string | null
  observed_revenue_onlyfans_account_id?: string | null
  is_connected?: boolean | null
}

function clampSeats(n: number | null | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_BILLING_SEATS
  return Math.min(MAX_BILLING_SEATS, Math.max(1, Math.floor(n)))
}

function focusPlatformsForSub(row: {
  billing_variant: string | null
  billing_focus_platforms: unknown
}): AdultBillingPlatform[] | undefined {
  if (row.billing_variant === 'multi') return undefined
  const raw = row.billing_focus_platforms
  if (Array.isArray(raw) && raw.length > 0) {
    return sortFocusPlatforms(raw as string[])
  }
  return ['onlyfans']
}

/**
 * Aligns Stripe subscription unit price + metadata to the revenue tier implied by
 * connected OnlyFans / Fansly observations. Uses `proration_behavior: 'none'` so the
 * new amount applies on the next invoice.
 *
 * Skips: non–paid plans; missing observations; tier already aligned; `past_due` and
 * other non-active/trialing statuses (no price moves while payment is failed);
 * `revenue_tier_sync_paused_until` in the future (admin/support override).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let stripe: ReturnType<typeof getStripe>
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const supabase = createServiceRoleClient()
  const { data: subs, error: subsErr } = await supabase
    .from('subscriptions')
    .select(
      'user_id, stripe_subscription_id, revenue_tier, billing_variant, billing_focus_platforms, billing_seats, plan_id, status, revenue_tier_sync_paused_until',
    )
    .not('stripe_subscription_id', 'is', null)

  if (subsErr) {
    return NextResponse.json({ error: subsErr.message }, { status: 500 })
  }

  const userIds = [...new Set((subs ?? []).map((s: { user_id: string }) => s.user_id).filter(Boolean))]
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, updated: 0, skipped: 0, errors: [] as string[] })
  }

  const { data: conns, error: connErr } = await supabase
    .from('platform_connections')
    .select(
      'user_id, platform, access_token, platform_user_id, observed_monthly_revenue_usd, observed_revenue_captured_at, observed_revenue_onlyfans_account_id, is_connected',
    )
    .in('user_id', userIds)
    .eq('is_connected', true)
    .in('platform', ['onlyfans', 'fansly'])

  if (connErr) {
    return NextResponse.json({ error: connErr.message }, { status: 500 })
  }

  const byUser = new Map<
    string,
    { of: PlatformConnectionObservedRow; fs: PlatformConnectionObservedRow }
  >()

  for (const raw of conns ?? []) {
    const c = raw as ConnRow
    const uid = String(c.user_id)
    const platform = String(c.platform).toLowerCase()
    const prev = byUser.get(uid) ?? { of: null, fs: null }
    const row: PlatformConnectionObservedRow = {
      access_token: c.access_token,
      platform_user_id: c.platform_user_id,
      observed_monthly_revenue_usd: c.observed_monthly_revenue_usd,
      observed_revenue_captured_at: c.observed_revenue_captured_at,
      observed_revenue_onlyfans_account_id: c.observed_revenue_onlyfans_account_id,
      is_connected: c.is_connected,
    }
    if (platform === 'onlyfans') prev.of = row
    if (platform === 'fansly') prev.fs = row
    byUser.set(uid, prev)
  }

  let processed = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of subs ?? []) {
    const r = row as {
      user_id: string
      stripe_subscription_id: string
      revenue_tier: number | null
      billing_variant: string | null
      billing_focus_platforms: unknown
      billing_seats: number | null
      plan_id: string
      status: string | null
      revenue_tier_sync_paused_until: string | null
    }
    processed++
    const st = (r.status || '').toLowerCase()
    if (st !== 'active' && st !== 'trialing') {
      skipped++
      continue
    }
    const pauseUntil = r.revenue_tier_sync_paused_until
    if (pauseUntil) {
      const t = Date.parse(pauseUntil)
      if (Number.isFinite(t) && t > Date.now()) {
        skipped++
        continue
      }
    }
    if (!isPaidPlanId(r.plan_id)) {
      skipped++
      continue
    }

    const bundle = byUser.get(r.user_id) ?? { of: null, fs: null }
    const required = computeRequiredRevenueTierFromScopedObservations({
      onlyfans: scopedObservationFromOnlyFansRow(bundle.of),
      fansly: scopedObservationFromFanslyRow(bundle.fs),
    })
    if (required == null) {
      skipped++
      continue
    }

    const subscribed =
      typeof r.revenue_tier === 'number' &&
      Number.isFinite(r.revenue_tier) &&
      r.revenue_tier >= 0 &&
      r.revenue_tier <= 10
        ? r.revenue_tier
        : 0
    if (required === subscribed) {
      skipped++
      continue
    }

    const variant: BillingVariant = r.billing_variant === 'multi' ? 'multi' : 'single'
    const focusPlatforms = focusPlatformsForSub(r)
    const seats = clampSeats(r.billing_seats)
    let unitCents: number
    try {
      unitCents = getMonthlyPriceCents(variant, required, focusPlatforms)
    } catch (e) {
      errors.push(`${r.user_id}: price ${e instanceof Error ? e.message : String(e)}`)
      continue
    }

    try {
      const sub = await stripe.subscriptions.retrieve(r.stripe_subscription_id, {
        expand: ['items.data.price.product'],
      })
      const item = sub.items.data[0]
      if (!item?.id) {
        errors.push(`${r.user_id}: no subscription item`)
        continue
      }
      const productRef = item.price?.product
      const productId =
        typeof productRef === 'string'
          ? productRef
          : productRef && typeof productRef === 'object' && 'id' in productRef
            ? String((productRef as { id: string }).id)
            : null
      if (!productId) {
        errors.push(`${r.user_id}: missing Stripe product on subscription item`)
        continue
      }

      const tierRow = getTierByIndex(required)
      const fps = variant === 'multi' ? [] : (focusPlatforms ?? ['onlyfans'])
      const focusList = fps.join(',')
      const focusLegacy = fps[0] ?? 'onlyfans'

      const meta: Record<string, string> = {
        ...(sub.metadata ?? {}),
        productId: (sub.metadata?.productId as string) || PAID_PLAN_ID,
        userId: r.user_id,
        billingVariant: variant,
        revenueTier: String(required),
        revenueBandLabel: tierRow?.label ?? '',
        focusPlatforms: focusList,
        focusPlatform: focusLegacy,
        seats: String(seats),
      }

      await stripe.subscriptions.update(r.stripe_subscription_id, {
        items: [
          {
            id: item.id,
            price_data: {
              currency: 'usd',
              product: productId,
              recurring: { interval: 'month' },
              unit_amount: unitCents,
            },
            quantity: seats,
          },
        ],
        proration_behavior: 'none',
        metadata: meta,
      })
      updated++
    } catch (e) {
      errors.push(`${r.user_id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    updated,
    skipped,
    errors: errors.slice(0, 80),
  })
}
