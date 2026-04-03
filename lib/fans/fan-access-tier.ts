/** Who can access Creatix vault row or platform post without extra PPV (approximate). */

export type FanAccessTier = 'free_feed' | 'all_subscribers' | 'ppv_or_locked' | 'unknown'

export function parseFanAccessTier(s: unknown): FanAccessTier {
  const t = String(s || '')
  if (t === 'free_feed' || t === 'all_subscribers' || t === 'ppv_or_locked' || t === 'unknown') return t
  return 'unknown'
}

export function formatFanAccessTierLabel(tier: FanAccessTier): string {
  switch (tier) {
    case 'free_feed':
      return 'free feed (visible to free followers)'
    case 'all_subscribers':
      return 'all paying subscribers (main feed)'
    case 'ppv_or_locked':
      return 'PPV / locked / paywall'
    default:
      return 'unknown access'
  }
}

export function formatContentAccessForAiSnippet(opts: {
  title: string
  contentType?: string | null
  isNsfw: boolean
  fanAccessTier: FanAccessTier
}): string {
  const access = formatFanAccessTierLabel(opts.fanAccessTier)
  const nsfw = opts.isNsfw ? 'NSFW/explicit' : 'non-explicit'
  return `${opts.title} [${opts.contentType ?? 'item'}] — ${nsfw}; fan access: ${access}.`
}
