import type { SupabaseClient } from '@supabase/supabase-js'
import { subscriptionTierFromTotalSpent } from '@/lib/fans/audience-classification'
import { subscriptionFieldsFromOnlyFansFan } from '@/lib/fans/subscription-dates'
import { subscriptionAccountTypeFromPrice } from '@/lib/fans/subscription-account-type'

/** Fan object shape from OnlyFansAPI list/detail endpoints (camelCase or mixed). */
export type OnlyFansPartnerFanLike = {
  id?: string | number
  username?: string
  name?: string
  avatar?: string | null
  subscribedAt?: string
  totalSpent?: number
  subscriptionPrice?: number | null
  expiresAt?: string
  renewsOn?: string | null
  isRenewOn?: boolean
}

export async function upsertOnlyFansFanToCrm(
  supabase: SupabaseClient,
  userId: string,
  fan: OnlyFansPartnerFanLike,
): Promise<{ ok: boolean; error?: string }> {
  const platform_fan_id = String(fan.id ?? '').trim()
  if (!platform_fan_id) return { ok: false, error: 'missing fan id' }

  const totalSpent = Number(fan.totalSpent) || 0
  const tier = subscriptionTierFromTotalSpent(totalSpent)
  const sub = subscriptionFieldsFromOnlyFansFan({
    expiresAt: fan.expiresAt,
    renewsOn: fan.renewsOn ?? null,
    isRenewOn: fan.isRenewOn,
  })
  const rawPrice = fan.subscriptionPrice
  const subscription_price =
    rawPrice != null &&
    (typeof rawPrice !== 'string' || rawPrice !== '') &&
    Number.isFinite(Number(rawPrice))
      ? Number(rawPrice)
      : null

  const usernameRaw = String(fan.username ?? '').trim()
  const username = usernameRaw || `user_${platform_fan_id}`

  const { error } = await supabase.from('fans').upsert(
    {
      user_id: userId,
      platform: 'onlyfans',
      platform_fan_id,
      username,
      display_name: fan.name ? String(fan.name) : null,
      avatar_url: fan.avatar ? String(fan.avatar) : null,
      first_subscribed_at: fan.subscribedAt || null,
      total_spent: totalSpent,
      subscription_tier: tier,
      last_interaction_at: new Date().toISOString(),
      subscription_price,
      subscription_account_type: subscriptionAccountTypeFromPrice(subscription_price),
      subscription_expires_at: sub.subscription_expires_at,
      subscription_renews_on: sub.subscription_renews_on,
      is_renewing: sub.is_renewing,
      subscription_status: sub.subscription_status,
    },
    { onConflict: 'user_id,platform,platform_fan_id' },
  )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
