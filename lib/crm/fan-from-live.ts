import type { Fan } from '@/lib/types'
import { subscriptionTierFromTotalSpent } from '@/lib/fans/audience-classification'
import { subscriptionAccountTypeFromPrice } from '@/lib/fans/subscription-account-type'
import { readPartnerTotalSpend } from '@/lib/crm/partner-fan-spend'
import { subscriptionFieldsFromFanslyFan, subscriptionFieldsFromOnlyFansFan } from '@/lib/fans/subscription-dates'

function strFrom(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

/** Live OnlyFans list row → CRM Fan shape (creatorUserId = Supabase user id). */
export function onlyFansLiveRowToFan(row: Record<string, unknown>, creatorUserId: string): Fan {
  const spent = readPartnerTotalSpend(row)
  const subTier = subscriptionTierFromTotalSpent(spent)
  const tier = (subTier === 'vip' ? 'whale' : subTier) as Fan['tier']
  const expiresRaw = strFrom(row, 'expiresAt', 'expires_at')
  const renewsRaw = strFrom(row, 'renewsOn', 'renews_on')
  const ofSub = subscriptionFieldsFromOnlyFansFan({
    expiresAt: expiresRaw ?? undefined,
    renewsOn: renewsRaw,
    isRenewOn:
      typeof row.isRenewOn === 'boolean'
        ? row.isRenewOn
        : typeof row.is_renew_on === 'boolean'
          ? row.is_renew_on
          : undefined,
  })
  const statusFromPartner = strFrom(row, 'subscriptionStatus', 'subscription_status')
  const subPriceRaw = row.subscriptionPrice ?? row.subscription_price
  const subscription_price =
    subPriceRaw != null && subPriceRaw !== '' && Number.isFinite(Number(subPriceRaw))
      ? Number(subPriceRaw)
      : null
  const subscribedAt = strFrom(row, 'subscribedAt', 'subscribed_at')
  const lastInteraction =
    strFrom(
      row,
      'lastInteraction',
      'last_interaction_at',
      'lastMessageAt',
      'last_message_at',
      'lastSeen',
      'last_seen',
      'lastActivity',
      'last_activity',
    ) || null
  const pf = String(row.id ?? row.user_id ?? row.userId ?? '')
  return {
    id: pf,
    user_id: creatorUserId,
    platform_fan_id: pf,
    platform: 'onlyfans',
    platform_username: String(row.username ?? row.userName ?? row.user_name ?? ''),
    display_name: row.name
      ? String(row.name)
      : row.displayName != null
        ? String(row.displayName)
        : row.display_name != null
          ? String(row.display_name)
          : null,
    avatar_url:
      row.avatar != null
        ? String(row.avatar)
        : row.avatarUrl != null
          ? String(row.avatarUrl)
          : row.avatar_url != null
            ? String(row.avatar_url)
            : null,
    tier,
    total_spent: spent,
    subscription_price,
    subscription_account_type: subscriptionAccountTypeFromPrice(subscription_price),
    subscription_status: statusFromPartner ?? ofSub.subscription_status,
    subscription_start: subscribedAt,
    subscription_expires_at: ofSub.subscription_expires_at,
    subscription_renews_on: ofSub.subscription_renews_on ?? renewsRaw,
    last_interaction: lastInteraction,
    notes: null,
    tags: Array.isArray(row.lists) ? (row.lists as string[]) : [],
    is_favorite: false,
    is_blocked: false,
    created_at: String(subscribedAt ?? new Date().toISOString()),
    updated_at: String(ofSub.subscription_expires_at ?? subscribedAt ?? new Date().toISOString()),
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
    subscription_price: null,
    subscription_account_type: subscriptionAccountTypeFromPrice(null),
    subscription_status: sub.subscription_status,
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
