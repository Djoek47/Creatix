import type { Stats } from '@/lib/onlyfans-api'

type LooseAccount = {
  fansCount?: number
  subscribersCount?: number
  followersCount?: number
  [key: string]: unknown
}

/**
 * Subscribers (primary “fan” count) vs free / non-sub “follows” for OnlyFans analytics snapshots.
 * When the account has both fansCount and subscribersCount, follows = max(0, fansCount − subscribersCount).
 */
export function onlyFansSubscribersAndFollows(
  stats: Stats | null,
  account: unknown,
): { subscribers: number; follows: number } {
  const a = (account as LooseAccount) || {}
  const statsTotal = stats?.fans?.total ?? 0
  const subscribers =
    typeof a.subscribersCount === 'number' ? a.subscribersCount : statsTotal

  const fansCount = typeof a.fansCount === 'number' ? a.fansCount : null
  let follows = 0
  if (fansCount != null && typeof a.subscribersCount === 'number') {
    follows = Math.max(0, fansCount - a.subscribersCount)
  } else if (typeof a.followersCount === 'number') {
    follows = Math.max(0, a.followersCount)
  }

  return {
    subscribers: Math.max(0, Math.floor(subscribers)),
    follows: Math.max(0, Math.floor(follows)),
  }
}
