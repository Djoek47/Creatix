import { formatFanAccessTierLabel, type FanAccessTier } from '@/lib/fans/fan-access-tier'

/**
 * Best-effort: infer post visibility from OnlyFans webhook payload shapes.
 * Defaults are conservative (unknown tier, may comment without unlock).
 */
export function inferPostFanAccessFromCommentPayload(data: unknown): {
  post_fan_access_tier: FanAccessTier
} {
  if (data == null) return { post_fan_access_tier: 'unknown' }
  try {
    const s = JSON.stringify(data).toLowerCase()
    if (/\bppv\b|paywall|locked|unlock|bundleprice|bundle_price|price\s*:\s*[1-9]/.test(s)) {
      return { post_fan_access_tier: 'ppv_or_locked' }
    }
    if (/subscribers?\s*only|sub_only|fans\s*only/.test(s)) {
      return { post_fan_access_tier: 'all_subscribers' }
    }
    if (/free\s*post|publicfeed|isfree["']?\s*:\s*true/.test(s)) {
      return { post_fan_access_tier: 'free_feed' }
    }
  } catch {
    // ignore
  }
  return { post_fan_access_tier: 'unknown' }
}

export function formatCommentPostAccessForAi(opts: {
  postFanAccessTier: FanAccessTier
  fanMayCommentWithoutUnlock: boolean
}): string {
  const post = formatFanAccessTierLabel(opts.postFanAccessTier)
  const unlock =
    opts.fanMayCommentWithoutUnlock
      ? 'Fans can often comment on posts they have not fully unlocked—do not assume they saw the media or purchased PPV for this post.'
      : ''
  return `Post access (best-effort): ${post}. ${unlock}`.trim()
}
