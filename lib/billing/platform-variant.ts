/**
 * Single vs Multi is a billing dimension: Single = OnlyFans-only among adult platforms;
 * Multi = OnlyFans plus at least one other adult platform (Fansly, ManyVids), or only non-OF adult connected.
 */

export const ADULT_BILLING_PLATFORMS = ['onlyfans', 'fansly', 'manyvids'] as const
export type AdultBillingPlatform = (typeof ADULT_BILLING_PLATFORMS)[number]

export interface PlatformConnectionLike {
  platform: string
  is_connected?: boolean | null
}

export function connectedAdultPlatforms(connections: PlatformConnectionLike[]): AdultBillingPlatform[] {
  const set = new Set<AdultBillingPlatform>()
  for (const c of connections) {
    if (!c.is_connected) continue
    const p = c.platform.toLowerCase()
    if ((ADULT_BILLING_PLATFORMS as readonly string[]).includes(p)) {
      set.add(p as AdultBillingPlatform)
    }
  }
  return [...set]
}

/** True when the user’s connected adult platforms match a “Single (OnlyFans-only)” subscription lane. */
export function isOnlyFansOnlyLane(connections: PlatformConnectionLike[]): boolean {
  const adult = connectedAdultPlatforms(connections)
  if (adult.length === 0) return true
  return adult.length === 1 && adult[0] === 'onlyfans'
}

/**
 * After the user connects `platformId`, would their adult footprint require a **Multi** subscription?
 * Single lane = OnlyFans only; any Fansly/ManyVids-only or multi-platform combo → Multi.
 */
export function multiLaneRequiredAfterConnect(
  connections: PlatformConnectionLike[],
  platformId: string,
): boolean {
  const pid = platformId.toLowerCase()
  if (!(ADULT_BILLING_PLATFORMS as readonly string[]).includes(pid)) return false

  const adult = new Set<string>(connectedAdultPlatforms(connections))
  adult.add(pid)

  const singleLaneOk = adult.size === 1 && adult.has('onlyfans')
  return !singleLaneOk
}
