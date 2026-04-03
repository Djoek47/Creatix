import type { Fan } from '@/lib/types'
import {
  buildAudienceBadges,
  isWhaleOrVipAudience,
  resolveCreatorLikelyFromInsight,
} from '@/lib/fans/audience-classification'
import { avatarUrlFromInsightProfileJson } from '@/lib/fans/avatar-from-profile-json'

export type ThreadInsightBrief = {
  platform: string
  platform_fan_id: string
  profile_json: unknown
  thread_snapshot_text: string | null
}

/**
 * Attach `audience` badges from spend tier + optional stored thread insight (creator signal).
 * @param tierOverride - Raw `subscription_tier` from DB when available (preserves vip vs whale).
 */
export function mergeThreadInsightsIntoFan(
  fan: Fan,
  insightByKey: Map<string, ThreadInsightBrief>,
  tierOverride?: string,
): Fan {
  const key = `${fan.platform}:${fan.platform_fan_id || fan.id}`
  const insight = insightByKey.get(key)
  const nameHay = [fan.platform_username, fan.display_name].filter(Boolean).join('\n')
  const creatorLikely = resolveCreatorLikelyFromInsight(
    insight?.profile_json,
    insight?.thread_snapshot_text ?? null,
    nameHay,
  )

  const spendDerived =
    fan.total_spent >= 500 ? 'vip' : fan.total_spent >= 100 ? 'whale' : null
  const tierForAudience = tierOverride?.trim() || spendDerived || fan.tier

  const badges = buildAudienceBadges({
    totalSpent: fan.total_spent,
    tier: tierForAudience,
    creatorLikely,
  })

  const insightAvatar = avatarUrlFromInsightProfileJson(insight?.profile_json)
  const avatar_url =
    fan.avatar_url && String(fan.avatar_url).trim().length > 0 ? fan.avatar_url : insightAvatar

  return {
    ...fan,
    avatar_url,
    audience: {
      isWhaleOrVip: isWhaleOrVipAudience(fan.total_spent, tierForAudience),
      isCreatorLikely: creatorLikely,
      badges,
    },
  }
}

export function insightRowsToMap(rows: ThreadInsightBrief[]): Map<string, ThreadInsightBrief> {
  const m = new Map<string, ThreadInsightBrief>()
  for (const r of rows) {
    if (r.platform_fan_id) m.set(`${r.platform}:${r.platform_fan_id}`, r)
  }
  return m
}
