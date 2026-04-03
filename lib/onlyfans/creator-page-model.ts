/**
 * Creator-level OnlyFans page model (free page vs paid subscription page).
 * Not the same as fans.subscription_account_type (per-fan list price).
 */

export type OnlyFansCreatorPageModel = 'free' | 'paid' | 'unknown'

export type OnlyFansCreatorPageModelSource = 'user' | 'api'

export function parseOnlyFansCreatorPageModel(raw: string | null | undefined): OnlyFansCreatorPageModel {
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'free' || s === 'paid' || s === 'unknown') return s
  return 'unknown'
}

/** First finite number found on known keys, shallow + one nested object level. */
function extractSubscribeListPrice(obj: unknown): number | null {
  if (!obj || typeof obj !== 'object') return null
  const keys = [
    'subscribePrice',
    'subscriptionPrice',
    'subscribe_price',
    'subscription_price',
    'subPrice',
    'currentSubscribePrice',
    'promotionsPrice',
    'price',
  ]
  const o = obj as Record<string, unknown>
  for (const k of keys) {
    if (k in o && o[k] != null) {
      const n = Number(o[k])
      if (Number.isFinite(n)) return n
    }
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>
      for (const k of keys) {
        if (k in inner && inner[k] != null) {
          const n = Number(inner[k])
          if (Number.isFinite(n)) return n
        }
      }
    }
  }
  return null
}

/**
 * Infer creator page model from GET /account JSON and/or listAccounts onlyfans_user_data.
 * Returns null if no reliable price signal.
 */
export function inferCreatorPageModelFromApiPayload(
  accountPayload: unknown,
  userDataPayload: unknown,
): OnlyFansCreatorPageModel | null {
  const a = extractSubscribeListPrice(accountPayload)
  const u = extractSubscribeListPrice(userDataPayload)
  const n = a != null ? a : u
  if (n == null) return null
  if (n <= 0) return 'free'
  return 'paid'
}

export function formatCreatorOnlyFansPageModelForAi(model: OnlyFansCreatorPageModel): string {
  if (model === 'free') {
    return `Creator OnlyFans page model: FREE PAGE ($0 follow). Revenue is mainly PPV, tips, paid messages, and bundles—not a monthly subscription gate for the feed. Many chatters may be $0 followers; that is normal. Do not treat low or zero spend as "they should not be here"; prioritize tasteful PPV / unlock framing when relevant. Fan-level CRM "free follower" flags still describe that fan's tier vs you, not your whole business model.`
  }
  if (model === 'paid') {
    return `Creator OnlyFans page model: PAID SUBSCRIPTION PAGE. Fans typically pay a recurring subscription; most feed content is included for active subs, with optional PPV add-ons. Prioritize retention, renewals, and subscriber-value language when appropriate. Fan-level CRM data still applies per fan.`
  }
  return `Creator OnlyFans page model: UNKNOWN (not set or not inferred). Do not assume either a free page or a paid subscription page—treat business model as unspecified. Same conservatism as fan-level "unknown" tier: do not assume full feed access; clarify offers as PPV, sub add-ons, or separate unlocks when relevant. Do not imply all followers pay a monthly sub or that the main feed is included for everyone.`
}

export function shouldApplyApiInferenceForCreatorPageModel(
  modelRaw: string | null | undefined,
  sourceRaw: string | null | undefined,
): boolean {
  if (sourceRaw === 'user') return false
  const m = parseOnlyFansCreatorPageModel(modelRaw)
  return m === 'unknown'
}
