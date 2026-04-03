import { detectCreatorLikelyFromText } from '@/lib/divine/creator-detector'

/** Labels that imply you still want fan-side automations (AI Chatter, Commenter analysis). */
const ENGAGED_FAN_LABELS = new Set([
  'fan',
  'subscriber',
  'whale',
  'vip',
  'client',
  'customer',
  'churn',
  'churn risk',
  'churn_risk',
  'churn-risk',
  'real fan',
])

/**
 * True when creator typed a classification that should opt into automations despite creator signals.
 */
export function classificationSuggestsEngagedFan(creatorClassification: string | null | undefined): boolean {
  const t = (creatorClassification || '').trim().toLowerCase()
  if (!t) return false
  if (ENGAGED_FAN_LABELS.has(t)) return true
  if (t.includes('real fan')) return true
  if (/\bchurn\b/i.test(t)) return true
  return false
}

export type SkipExpensiveAiReason = 'creator_likely' | 'policy_off'

/**
 * When `skip_expensive_ai_for_creator_likely` is true (default in app logic), skip AI Chatter / Commenter
 * for contacts that look like fellow creators unless overridden per fan.
 */
export function shouldSkipExpensiveAiForContact(args: {
  platformAbout: string | null | undefined
  username: string | null | undefined
  displayName: string | null | undefined
  threadExcerpt: string | null | undefined
  treatAsFanForAutomation: boolean
  creatorClassification: string | null | undefined
  /** From divine_manager_settings.automation_rules.alerts.skip_expensive_ai_for_creator_likely — default true when undefined */
  policySkipWhenLikelyCreator: boolean
}): { skip: boolean; reason?: SkipExpensiveAiReason } {
  if (!args.policySkipWhenLikelyCreator) {
    return { skip: false }
  }
  if (args.treatAsFanForAutomation) {
    return { skip: false }
  }
  if (classificationSuggestsEngagedFan(args.creatorClassification)) {
    return { skip: false }
  }

  const hay = [
    args.platformAbout,
    args.username,
    args.displayName,
    args.threadExcerpt,
  ]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .join('\n')

  const signal = detectCreatorLikelyFromText(hay)
  if (signal.is_creator_likely) {
    return { skip: true, reason: 'creator_likely' }
  }
  return { skip: false }
}

export function policySkipExpensiveAiForCreatorLikely(
  alerts: { skip_expensive_ai_for_creator_likely?: boolean } | null | undefined,
): boolean {
  return alerts?.skip_expensive_ai_for_creator_likely !== false
}
