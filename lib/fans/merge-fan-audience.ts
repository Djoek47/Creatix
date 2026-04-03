import type { Fan, FanAudienceMeta } from '@/lib/types'
import {
  buildAudienceBadges,
  isWhaleOrVipAudience,
  resolveCreatorLikelyFromInsight,
} from '@/lib/fans/audience-classification'
import { avatarUrlFromInsightProfileJson } from '@/lib/fans/avatar-from-profile-json'

/** Apply manual CRM profile type from `fan.audience_profile_override`. */
export function applyAudienceProfileOverride(
  fan: Fan,
  base: FanAudienceMeta,
  tierForAudience: string,
): FanAudienceMeta {
  const o = fan.audience_profile_override
  if (!o || o === 'auto') return base

  if (o === 'whale') {
    const tier = fan.total_spent >= 500 ? 'vip' : 'whale'
    return {
      isWhaleOrVip: true,
      isCreatorLikely: base.isCreatorLikely,
      badges: buildAudienceBadges({
        totalSpent: Math.max(fan.total_spent, 100),
        tier,
        creatorLikely: base.isCreatorLikely,
      }),
    }
  }

  if (o === 'creator') {
    return {
      isWhaleOrVip: isWhaleOrVipAudience(fan.total_spent, tierForAudience),
      isCreatorLikely: true,
      badges: buildAudienceBadges({
        totalSpent: fan.total_spent,
        tier: tierForAudience,
        creatorLikely: true,
      }),
    }
  }

  if (o === 'fan') {
    return {
      isWhaleOrVip: isWhaleOrVipAudience(fan.total_spent, tierForAudience),
      isCreatorLikely: false,
      badges: buildAudienceBadges({
        totalSpent: fan.total_spent,
        tier: tierForAudience,
        creatorLikely: false,
      }),
    }
  }

  return base
}

/** Badges + flags for profile UIs when you have CRM numbers + detector but not a full `Fan` row. */
export function audienceMetaWithProfileOverride(
  audience_profile_override: Fan['audience_profile_override'],
  totalSpent: number,
  tierForAudience: string,
  creatorLikely: boolean,
): FanAudienceMeta {
  const base: FanAudienceMeta = {
    isWhaleOrVip: isWhaleOrVipAudience(totalSpent, tierForAudience),
    isCreatorLikely: creatorLikely,
    badges: buildAudienceBadges({
      totalSpent,
      tier: tierForAudience,
      creatorLikely,
    }),
  }
  const stub: Fan = {
    id: '',
    user_id: '',
    platform: 'onlyfans',
    platform_username: '',
    display_name: null,
    avatar_url: null,
    tier: 'regular',
    total_spent: totalSpent,
    subscription_start: null,
    last_interaction: null,
    notes: null,
    tags: [],
    is_favorite: false,
    is_blocked: false,
    created_at: '',
    updated_at: '',
    audience_profile_override,
  }
  return applyAudienceProfileOverride(stub, base, tierForAudience)
}

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

  const baseAudience: FanAudienceMeta = {
    isWhaleOrVip: isWhaleOrVipAudience(fan.total_spent, tierForAudience),
    isCreatorLikely: creatorLikely,
    badges: buildAudienceBadges({
      totalSpent: fan.total_spent,
      tier: tierForAudience,
      creatorLikely,
    }),
  }

  const insightAvatar = avatarUrlFromInsightProfileJson(insight?.profile_json)
  const avatar_url =
    fan.avatar_url && String(fan.avatar_url).trim().length > 0 ? fan.avatar_url : insightAvatar

  return {
    ...fan,
    avatar_url,
    audience: applyAudienceProfileOverride(fan, baseAudience, tierForAudience),
  }
}

export function insightRowsToMap(rows: ThreadInsightBrief[]): Map<string, ThreadInsightBrief> {
  const m = new Map<string, ThreadInsightBrief>()
  for (const r of rows) {
    if (r.platform_fan_id) m.set(`${r.platform}:${r.platform_fan_id}`, r)
  }
  return m
}
