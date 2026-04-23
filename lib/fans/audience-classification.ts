/**
 * Spend bands and audience badges (whale / creator-likely / fan) for CRM UI.
 * Aligns with OnlyFans webhook tier logic: >=100 whale, >=500 vip.
 */
import type { CreatorDetectorSignal } from '@/lib/divine/creator-detector'
import { detectCreatorLikelyFromText } from '@/lib/divine/creator-detector'
import type { FanProfileType } from '@/lib/fans/profile-types'

export const FAN_SPEND_WHALE_MIN_USD = 100
export const FAN_SPEND_VIP_MIN_USD = 500

export type WhaleSpendLabel = 'VIP' | 'Whale'

/** Same tier labels as webhook / sync (subscription_tier). */
export function subscriptionTierFromTotalSpent(totalSpent: number): 'vip' | 'whale' | 'regular' {
  if (totalSpent >= FAN_SPEND_VIP_MIN_USD) return 'vip'
  if (totalSpent >= FAN_SPEND_WHALE_MIN_USD) return 'whale'
  return 'regular'
}

export function isWhaleOrVipSpend(totalSpent: number): boolean {
  return totalSpent >= FAN_SPEND_WHALE_MIN_USD
}

export function whaleSpendLabel(totalSpent: number): WhaleSpendLabel {
  return totalSpent >= FAN_SPEND_VIP_MIN_USD ? 'VIP' : 'Whale'
}

/**
 * High-value fan for purple badge: spend threshold or tier already marked whale/vip.
 * Note: UI tier type may collapse vip→whale; spend is authoritative for VIP vs Whale label.
 */
export function isWhaleOrVipAudience(totalSpent: number, tier: string): boolean {
  const t = (tier || '').toLowerCase()
  if (t === 'whale' || t === 'vip') return true
  return isWhaleOrVipSpend(totalSpent)
}

export function audienceWhaleLabel(totalSpent: number, tier: string): WhaleSpendLabel | null {
  if (!isWhaleOrVipAudience(totalSpent, tier)) return null
  const t = (tier || '').toLowerCase()
  if (t === 'vip' || totalSpent >= FAN_SPEND_VIP_MIN_USD) return 'VIP'
  return 'Whale'
}

export type AudienceBadge = {
  key: 'whale' | 'creator' | 'fan' | 'paying_creator' | 'advertisement' | 'freeloader'
  label: string
  className: string
}

export const AUDIENCE_BADGE_WHALE =
  'border-violet-500/50 bg-violet-500/15 text-violet-100 dark:text-violet-200'
export const AUDIENCE_BADGE_CREATOR =
  'border-red-500/45 bg-red-500/10 text-red-100 dark:text-red-200'
export const AUDIENCE_BADGE_FAN =
  'border-emerald-500/45 bg-emerald-500/10 text-emerald-100 dark:text-emerald-200'
export const AUDIENCE_BADGE_PAYING_CREATOR =
  'border-fuchsia-500/45 bg-fuchsia-500/10 text-fuchsia-100 dark:text-fuchsia-200'
export const AUDIENCE_BADGE_ADVERTISEMENT =
  'border-amber-500/45 bg-amber-500/10 text-amber-100 dark:text-amber-200'
export const AUDIENCE_BADGE_FREELOADER =
  'border-slate-500/45 bg-slate-500/10 text-slate-100 dark:text-slate-200'

export type AudienceClassificationInput = {
  totalSpent: number
  tier: string
  creatorLikely: boolean
  profileType?: FanProfileType | null
}

/**
 * Build visible badges: purple whale/vip (if any), red creator (if likely), green fan (if not creator).
 * Whale and creator can both show (dual tags).
 */
export function buildAudienceBadges(input: AudienceClassificationInput): AudienceBadge[] {
  if (input.profileType === 'paying_creator') {
    return [
      {
        key: 'paying_creator',
        label: 'Paying creator',
        className: AUDIENCE_BADGE_PAYING_CREATOR,
      },
    ]
  }
  if (input.profileType === 'advertisement') {
    return [
      {
        key: 'advertisement',
        label: 'Advertisement',
        className: AUDIENCE_BADGE_ADVERTISEMENT,
      },
    ]
  }
  if (input.profileType === 'freeloader') {
    return [
      {
        key: 'freeloader',
        label: 'Freeloader',
        className: AUDIENCE_BADGE_FREELOADER,
      },
    ]
  }
  if (input.profileType === 'fan') {
    return [{ key: 'fan', label: 'Typical fan', className: AUDIENCE_BADGE_FAN }]
  }
  if (input.profileType === 'creator') {
    return [{ key: 'creator', label: 'Creator signal', className: AUDIENCE_BADGE_CREATOR }]
  }

  const badges: AudienceBadge[] = []
  if (input.profileType === 'whale') {
    badges.push({ key: 'whale', label: 'Whale', className: AUDIENCE_BADGE_WHALE })
    return badges
  }
  const whaleLabel = audienceWhaleLabel(input.totalSpent, input.tier)
  if (whaleLabel) {
    badges.push({
      key: 'whale',
      label: whaleLabel,
      className: AUDIENCE_BADGE_WHALE,
    })
  }
  if (input.creatorLikely) {
    badges.push({
      key: 'creator',
      label: 'Creator signal',
      className: AUDIENCE_BADGE_CREATOR,
    })
  }
  if (!input.creatorLikely) {
    badges.push({
      key: 'fan',
      label: 'Fan',
      className: AUDIENCE_BADGE_FAN,
    })
  }
  return badges
}

export function readCreatorDetectorFromProfileJson(profileJson: unknown): CreatorDetectorSignal | null {
  if (!profileJson || typeof profileJson !== 'object') return null
  const raw = (profileJson as Record<string, unknown>).creator_detector
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const is_creator_likely = o.is_creator_likely === true
  const confidence = typeof o.confidence === 'number' ? Math.min(1, Math.max(0, o.confidence)) : 0
  const rationale = Array.isArray(o.rationale_snippets)
    ? (o.rationale_snippets as unknown[]).map((x) => String(x)).filter(Boolean)
    : []
  return { is_creator_likely, confidence, rationale_snippets: rationale }
}

export function resolveCreatorLikelyFromInsight(
  profileJson: unknown,
  threadSnapshotText: string | null | undefined,
  nameHaystack: string,
): boolean {
  const stored = readCreatorDetectorFromProfileJson(profileJson)
  if (stored) return stored.is_creator_likely
  const hay = [nameHaystack, threadSnapshotText || ''].filter(Boolean).join('\n')
  return detectCreatorLikelyFromText(hay).is_creator_likely
}

export function classifyAudience(input: AudienceClassificationInput): {
  badges: AudienceBadge[]
  isWhaleOrVip: boolean
  whaleLabel: WhaleSpendLabel | null
  isCreatorLikely: boolean
} {
  const whaleLabel = audienceWhaleLabel(input.totalSpent, input.tier)
  const forcedCreator = input.profileType === 'creator' || input.profileType === 'paying_creator'
  const forcedNonCreator =
    input.profileType === 'fan' || input.profileType === 'advertisement' || input.profileType === 'freeloader'
  return {
    badges: buildAudienceBadges(input),
    isWhaleOrVip: input.profileType === 'whale' || whaleLabel != null,
    whaleLabel,
    isCreatorLikely: forcedCreator ? true : forcedNonCreator ? false : input.creatorLikely,
  }
}
