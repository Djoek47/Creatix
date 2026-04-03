import type { Fan } from '@/lib/types'
import { subscriptionTierFromTotalSpent } from '@/lib/fans/audience-classification'
import { subscriptionAccountTypeFromPrice } from '@/lib/fans/subscription-account-type'
import { subscriptionFieldsFromFanslyFan } from '@/lib/fans/subscription-dates'

/** Live OnlyFans list row → CRM Fan shape (creatorUserId = Supabase user id). */
export function onlyFansLiveRowToFan(row: Record<string, unknown>, creatorUserId: string): Fan {
  const spent = Number(row.totalSpent) || 0
  const subTier = subscriptionTierFromTotalSpent(spent)
  const tier = (subTier === 'vip' ? 'whale' : subTier) as Fan['tier']
  const expiresAt = row.expiresAt != null && String(row.expiresAt).trim() ? String(row.expiresAt) : null
  const renewsOn = row.renewsOn != null && String(row.renewsOn).trim() ? String(row.renewsOn) : null
  const subPriceRaw = row.subscriptionPrice
  const subscription_price =
    subPriceRaw != null && subPriceRaw !== '' && Number.isFinite(Number(subPriceRaw))
      ? Number(subPriceRaw)
      : null
  const pf = String(row.id ?? '')
  return {
    id: pf,
    user_id: creatorUserId,
    platform_fan_id: pf,
    platform: 'onlyfans',
    platform_username: String(row.username ?? ''),
    display_name: row.name ? String(row.name) : null,
    avatar_url: row.avatar ? String(row.avatar) : null,
    tier,
    total_spent: spent,
    subscription_price,
    subscription_account_type: subscriptionAccountTypeFromPrice(subscription_price),
    subscription_start: row.subscribedAt ? String(row.subscribedAt) : null,
    subscription_expires_at: expiresAt,
    subscription_renews_on: renewsOn,
    last_interaction: null,
    notes: null,
    tags: Array.isArray(row.lists) ? (row.lists as string[]) : [],
    is_favorite: false,
    is_blocked: false,
    created_at: String(row.subscribedAt ?? new Date().toISOString()),
    updated_at: String(row.expiresAt ?? row.subscribedAt ?? new Date().toISOString()),
  }
}

type FanslySubscriber = {
  id: string
  username: string
  displayName: string
  avatar: string
  subscribedAt: string
  expiresAt: string
  totalSpent: number
  subscriptionTier: string
}

/** Live Fansly subscriber → CRM Fan shape. */
export function fanslyLiveToFan(f: FanslySubscriber, creatorUserId: string): Fan {
  const spent = Number(f.totalSpent) || 0
  const subTier = subscriptionTierFromTotalSpent(spent)
  const tier = (subTier === 'vip' ? 'whale' : subTier) as Fan['tier']
  const sub = subscriptionFieldsFromFanslyFan({ expiresAt: f.expiresAt })
  return {
    id: f.id,
    user_id: creatorUserId,
    platform_fan_id: f.id,
    platform: 'fansly',
    platform_username: f.username,
    display_name: f.displayName || f.username || null,
    avatar_url: f.avatar || null,
    tier,
    total_spent: spent,
    subscription_start: f.subscribedAt ? String(f.subscribedAt) : null,
    subscription_expires_at: sub.subscription_expires_at,
    last_interaction: null,
    notes: null,
    tags: [],
    is_favorite: false,
    is_blocked: false,
    created_at: String(f.subscribedAt ?? new Date().toISOString()),
    updated_at: new Date().toISOString(),
  }
}

export function fanDedupeKey(f: Fan): string {
  const pid = (f.platform_fan_id && String(f.platform_fan_id).trim()) || f.id
  return `${f.platform}:${String(pid)}`
}
