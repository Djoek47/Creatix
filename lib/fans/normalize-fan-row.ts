import type { Fan } from '@/lib/types'
import type { SubscriptionAccountType } from '@/lib/fans/subscription-account-type'
import { subscriptionAccountTypeFromPrice } from '@/lib/fans/subscription-account-type'
import { normalizeAudienceProfileOverride } from '@/lib/fans/profile-types'

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Map a Supabase `fans` row (or similar) to the dashboard `Fan` shape. */
export function normalizeFanFromRow(row: Record<string, unknown>): Fan {
  const tier = (row.subscription_tier ?? row.tier ?? 'regular') as string
  const username = (row.username ?? row.platform_username ?? '') as string
  const subPrice = numOrNull(row.subscription_price)
  const satRaw = row.subscription_account_type as string | undefined
  const subscription_account_type: SubscriptionAccountType =
    satRaw === 'free' || satRaw === 'paid' || satRaw === 'unknown'
      ? satRaw
      : subscriptionAccountTypeFromPrice(subPrice)
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    platform_fan_id: (row.platform_fan_id ?? null) as string | null,
    platform: (row.platform ?? 'onlyfans') as Fan['platform'],
    platform_username: username,
    display_name: (row.display_name ?? null) as string | null,
    avatar_url: (row.avatar_url ?? null) as string | null,
    tier: (tier === 'vip' ? 'whale' : tier) as Fan['tier'],
    total_spent: Number(row.total_spent) || 0,
    subscription_price: subPrice,
    subscription_account_type,
    subscription_status:
      typeof row.subscription_status === 'string' && row.subscription_status.trim()
        ? row.subscription_status.trim()
        : null,
    spend_subscriptions: numOrNull(row.spend_subscriptions),
    spend_tips: numOrNull(row.spend_tips),
    spend_messages: numOrNull(row.spend_messages),
    spend_posts: numOrNull(row.spend_posts),
    subscription_start: (row.first_subscribed_at ?? row.subscription_start ?? null) as string | null,
    subscription_expires_at: (row.subscription_expires_at ?? null) as string | null,
    subscription_renews_on: (row.subscription_renews_on ?? null) as string | null,
    last_interaction: (row.last_interaction_at ?? row.last_interaction ?? null) as string | null,
    notes: (row.notes ?? null) as string | null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    is_favorite: Boolean(row.is_favorite),
    is_blocked: Boolean(row.is_blocked),
    created_at: (row.created_at ?? new Date().toISOString()) as string,
    updated_at: (row.updated_at ?? row.created_at ?? new Date().toISOString()) as string,
    audience_profile_override: (() => {
      const v =
        row.audience_profile_override != null && String(row.audience_profile_override).trim() !== ''
          ? row.audience_profile_override
          : (row as { audienceProfileOverride?: unknown }).audienceProfileOverride
      return normalizeAudienceProfileOverride(v)
    })(),
  }
}
