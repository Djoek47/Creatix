/**
 * Focus (single) = one chosen adult platform; Unified (multi) = all adult platforms in one workspace.
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

function normalizedFocusPlatform(
  focusPlatform: AdultBillingPlatform | string | null | undefined,
): AdultBillingPlatform {
  const raw = (focusPlatform ?? 'onlyfans').toLowerCase()
  if ((ADULT_BILLING_PLATFORMS as readonly string[]).includes(raw)) {
    return raw as AdultBillingPlatform
  }
  return 'onlyfans'
}

/**
 * True if connecting `platformIdToConnect` would violate a paid **Focus** plan (wrong or second adult platform).
 * Always false for Unified (`multi`) or non-adult platforms.
 */
export function focusUpgradeRequired(
  connections: PlatformConnectionLike[],
  billingVariant: 'single' | 'multi' | null | undefined,
  focusPlatform: AdultBillingPlatform | string | null | undefined,
  platformIdToConnect: string,
): boolean {
  const pid = platformIdToConnect.toLowerCase()
  if (!(ADULT_BILLING_PLATFORMS as readonly string[]).includes(pid)) return false
  if (billingVariant !== 'single') return false

  const focus = normalizedFocusPlatform(focusPlatform)
  const adult = new Set<string>(connectedAdultPlatforms(connections))
  adult.add(pid)

  if (adult.size !== 1) return true
  const only = [...adult][0]
  return only !== focus
}
