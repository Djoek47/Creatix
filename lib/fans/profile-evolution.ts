import { normalizeAudienceProfileOverride, type FanProfileType } from '@/lib/fans/profile-types'

export type ProfileEvolutionInput = {
  manualOverride: FanProfileType | null
  totalSpent: number
  fanTenureDays: number | null
  creatorLikely: boolean
  hasPpvSignalFromFan: boolean
  adPatternScore: number
  outboundSellingScore: number
}

export type ProfileEvolutionResult = {
  profileType: FanProfileType
  source: 'manual' | 'evolved'
  reason: string
}

export function deriveProfileType(input: ProfileEvolutionInput): ProfileEvolutionResult {
  const manual = normalizeAudienceProfileOverride(input.manualOverride)
  if (manual != null) {
    return {
      profileType: manual,
      source: 'manual',
      reason: 'Manual override has priority',
    }
  }

  if (input.hasPpvSignalFromFan || input.outboundSellingScore >= 2) {
    return {
      profileType: 'paying_creator',
      source: 'evolved',
      reason: 'PPV/selling signal from fan account',
    }
  }

  if (input.adPatternScore >= 2) {
    return {
      profileType: 'advertisement',
      source: 'evolved',
      reason: 'Repeated promo or ad pattern',
    }
  }

  if (input.totalSpent >= 500 || (input.totalSpent >= 120 && (input.fanTenureDays ?? 0) >= 45)) {
    return {
      profileType: 'whale',
      source: 'evolved',
      reason: 'High spend and retention',
    }
  }

  if (input.creatorLikely) {
    return {
      profileType: 'creator',
      source: 'evolved',
      reason: 'Creator-like profile or thread signals',
    }
  }

  if (input.totalSpent <= 1 && (input.fanTenureDays ?? 0) >= 60) {
    return {
      profileType: 'freeloader',
      source: 'evolved',
      reason: 'Low spend over long tenure',
    }
  }

  return {
    profileType: 'fan',
    source: 'evolved',
    reason: 'Default segment',
  }
}
