/**
 * Settings JSON for `ai_chatter_automations.settings`.
 */
export type AiChatterSendMode = 'queue_review' | 'auto_send_opt_in' | 'experimental_auto'

/** Standard chatter vs VIP-only draft mode (never auto-sends). */
export type AiChatterEngagementProfile = 'standard' | 'whale_whisper'

export interface AiChatterSettings {
  send_mode: AiChatterSendMode
  /** When true, include creator gift wishlist items in compose context. */
  use_gift_wishlist: boolean
  /** Whale whisper: same pipeline but outbox-only; see worker. */
  engagement_profile: AiChatterEngagementProfile
  /** Max AI chatter replies per UTC day (draft or sent). */
  max_replies_per_day: number
  min_minutes_between_sends: number
  escalation_keywords: string[]
  notify_on_risk: boolean
  /** Bias prompt toward upsell / whale nurture. */
  whale_nurture_tone: boolean
  /**
   * When true with auto_send / experimental, allows outbound even if Mimic has neverSendWithoutReview.
   * UI must require beta acknowledgment before enabling.
   */
  bypass_mimic_review_gate: boolean
}

export const DEFAULT_AI_CHATTER_SETTINGS: AiChatterSettings = {
  send_mode: 'queue_review',
  use_gift_wishlist: true,
  engagement_profile: 'standard',
  max_replies_per_day: 30,
  min_minutes_between_sends: 3,
  escalation_keywords: [],
  notify_on_risk: true,
  whale_nurture_tone: true,
  bypass_mimic_review_gate: false,
}

export function parseAiChatterSettings(raw: unknown): AiChatterSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AI_CHATTER_SETTINGS }
  const o = raw as Record<string, unknown>
  const mode = o.send_mode
  const send_mode: AiChatterSendMode =
    mode === 'auto_send_opt_in' || mode === 'experimental_auto' ? mode : 'queue_review'
  const profile = o.engagement_profile
  const engagement_profile: AiChatterEngagementProfile =
    profile === 'whale_whisper' ? 'whale_whisper' : 'standard'
  return {
    ...DEFAULT_AI_CHATTER_SETTINGS,
    send_mode,
    use_gift_wishlist: o.use_gift_wishlist !== false,
    engagement_profile,
    max_replies_per_day:
      typeof o.max_replies_per_day === 'number' && o.max_replies_per_day > 0
        ? Math.min(200, Math.floor(o.max_replies_per_day))
        : DEFAULT_AI_CHATTER_SETTINGS.max_replies_per_day,
    min_minutes_between_sends:
      typeof o.min_minutes_between_sends === 'number' && o.min_minutes_between_sends >= 0
        ? Math.min(240, Math.floor(o.min_minutes_between_sends))
        : DEFAULT_AI_CHATTER_SETTINGS.min_minutes_between_sends,
    escalation_keywords: Array.isArray(o.escalation_keywords)
      ? o.escalation_keywords.filter((x): x is string => typeof x === 'string').map((s) => s.toLowerCase())
      : [],
    notify_on_risk: o.notify_on_risk !== false,
    whale_nurture_tone: o.whale_nurture_tone !== false,
    bypass_mimic_review_gate: o.bypass_mimic_review_gate === true,
  }
}
