import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { effectiveMonthlyCreditLimit } from '@/lib/billing/credit-economics'
import { getCreditWalletState } from '@/lib/billing/credit-wallet'
import {
  defaultCreditAutoTopupSettings,
  isCreditAutoTopupGloballyEnabled,
  maybeResetMonthlySpendWindow,
  normalizeSettingsRow,
  type CreditAutoTopupSettingsRow,
} from '@/lib/billing/credit-auto-topup'
import { resolveDefaultPaymentMethodId } from '@/lib/billing/credit-auto-topup-stripe'
import { getStripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [{ data: subscription }, wallet, { data: autoRow }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select(
          'plan_id,status,ai_credits_used,ai_credits_limit,billing_variant,revenue_tier,billing_focus_platform,billing_focus_platforms,billing_seats,stripe_customer_id,protection_plan_active',
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      getCreditWalletState(supabase, user.id),
      supabase.from('credit_auto_topup_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    const row = (subscription ?? {}) as {
      plan_id?: string | null
      status?: string | null
      ai_credits_used?: number | null
      ai_credits_limit?: number | null
      billing_variant?: string | null
      revenue_tier?: number | null
      billing_focus_platform?: string | null
      billing_focus_platforms?: string[] | null
      billing_seats?: number | null
      stripe_customer_id?: string | null
      protection_plan_active?: boolean | null
    }

    const aiCreditsUsed = Number(row.ai_credits_used ?? 0)
    const status = String(row.status ?? '').toLowerCase()
    const canUseIncludedCredits = status === 'active' || status === 'trialing'
    const aiCreditsLimitEffective = canUseIncludedCredits
      ? effectiveMonthlyCreditLimit({
          plan_id: row.plan_id,
          billing_variant: row.billing_variant,
          revenue_tier: row.revenue_tier,
          billing_focus_platform: row.billing_focus_platform,
          billing_focus_platforms: row.billing_focus_platforms,
          billing_seats: row.billing_seats,
          ai_credits_limit: row.ai_credits_limit,
        })
      : 0

    let autoTopupSettings: CreditAutoTopupSettingsRow = autoRow
      ? normalizeSettingsRow(autoRow as CreditAutoTopupSettingsRow)
      : defaultCreditAutoTopupSettings(user.id)

    const reset = maybeResetMonthlySpendWindow(autoTopupSettings)
    if (reset.monthly_window_start !== autoTopupSettings.monthly_window_start && autoRow) {
      await supabase
        .from('credit_auto_topup_settings')
        .update({
          monthly_spent_usd_cents: 0,
          monthly_window_start: reset.monthly_window_start,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
      autoTopupSettings = {
        ...autoTopupSettings,
        monthly_spent_usd_cents: 0,
        monthly_window_start: reset.monthly_window_start,
      }
    }

    const stripeCustomerId = row.stripe_customer_id ?? null
    let hasDefaultPaymentMethod = false
    let lastReceiptUrl: string | null = null

    if (stripeCustomerId) {
      hasDefaultPaymentMethod = !!(await resolveDefaultPaymentMethodId(stripeCustomerId))
      const piId = autoTopupSettings.last_payment_intent_id
      if (piId) {
        try {
          const pi = await getStripe().paymentIntents.retrieve(piId, { expand: ['latest_charge'] })
          const ch = pi.latest_charge
          if (ch && typeof ch === 'object' && 'receipt_url' in ch) {
            const url = (ch as { receipt_url?: string | null }).receipt_url
            lastReceiptUrl = typeof url === 'string' ? url : null
          }
        } catch {
          lastReceiptUrl = null
        }
      }
    }

    return NextResponse.json({
      wallet,
      aiCreditsUsed,
      aiCreditsLimitEffective,
      aiCreditsRemainingLegacy: Math.max(0, aiCreditsLimitEffective - aiCreditsUsed),
      autoTopupSettings,
      stripe: {
        hasDefaultPaymentMethod,
        stripeCustomerId,
        lastReceiptUrl,
      },
      flags: {
        creditAutoTopupServerEnabled: isCreditAutoTopupGloballyEnabled(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load usage dashboard' }, { status: 500 })
  }
}
