import type { Fan } from '@/lib/types'

/** Map a Supabase `fans` row (or similar) to the dashboard `Fan` shape. */
export function normalizeFanFromRow(row: Record<string, unknown>): Fan {
  const tier = (row.subscription_tier ?? row.tier ?? 'regular') as string
  const username = (row.username ?? row.platform_username ?? '') as string
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
  }
}
