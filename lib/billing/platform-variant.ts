/**
 * Focus (single) = 1–2 allowed adult platforms; Unified (multi) = all adult platforms in one workspace.
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

/** Dedupe, filter to adult billing ids, sort for stable Stripe metadata and DB. */
export function sortFocusPlatforms(
  platforms: readonly (AdultBillingPlatform | string)[],
): AdultBillingPlatform[] {
  const valid: AdultBillingPlatform[] = []
  for (const p of platforms) {
    const x = String(p).toLowerCase().trim()
    if ((ADULT_BILLING_PLATFORMS as readonly string[]).includes(x)) {
      valid.push(x as AdultBillingPlatform)
    }
  }
  return [...new Set(valid)].sort()
}

/** Parse comma-separated Stripe metadata; 1–2 platforms, or null if invalid/empty. */
export function parseFocusPlatformsFromComma(raw: string | null | undefined): AdultBillingPlatform[] | null {
  if (raw == null || String(raw).trim() === '') return null
  const parts = String(raw)
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
  const sorted = sortFocusPlatforms(parts)
  if (sorted.length === 0) return null
  if (sorted.length > 2) return null
  return sorted
}

/** DB row → allowed Focus platforms (array column with legacy scalar fallback). */
export function resolveAllowedFocusPlatforms(
  platforms: string[] | null | undefined,
  legacyPlatform: string | null | undefined,
): AdultBillingPlatform[] {
  if (platforms?.length) {
    const v = sortFocusPlatforms(platforms)
    if (v.length >= 1 && v.length <= 2) return v
  }
  const leg = legacyPlatform?.toLowerCase().trim()
  if (leg && (ADULT_BILLING_PLATFORMS as readonly string[]).includes(leg)) {
    return [leg as AdultBillingPlatform]
  }
  return ['onlyfans']
}

/** Stripe / subscriptions row fields used for Focus vs Unified resolution. */
export interface SubscriptionFocusFields {
  billing_variant?: string | null
  billing_focus_platforms?: string[] | null
  billing_focus_platform?: string | null
  status?: string | null
}

const SUBSCRIPTION_STATUSES_ENFORCING_FOCUS: ReadonlySet<string> = new Set([
  'active',
  'trialing',
  'past_due',
])

/**
 * Focus vs Unified when `billing_variant` is missing on legacy rows: infer from focus columns;
 * unknown → Unified (do not block extra platforms).
 */
export function effectiveBillingVariant(row: SubscriptionFocusFields | null | undefined): 'single' | 'multi' {
  if (!row) return 'multi'
  if (row.billing_variant === 'multi') return 'multi'
  if (row.billing_variant === 'single') return 'single'
  if (row.billing_focus_platforms?.length) {
    const v = sortFocusPlatforms(row.billing_focus_platforms)
    if (v.length >= 1 && v.length <= 2) return 'single'
  }
  const leg = row.billing_focus_platform?.toLowerCase().trim()
  if (leg && (ADULT_BILLING_PLATFORMS as readonly string[]).includes(leg)) {
    return 'single'
  }
  return 'multi'
}

/**
 * True if connecting `platformIdToConnect` would add or use a platform outside the Focus allowance.
 * False for Unified (`multi`) or non-adult platforms.
 */
export function focusUpgradeRequired(
  connections: PlatformConnectionLike[],
  billingVariant: 'single' | 'multi' | null | undefined,
  allowedPlatforms: AdultBillingPlatform[] | null | undefined,
  platformIdToConnect: string,
): boolean {
  const pid = platformIdToConnect.toLowerCase()
  if (!(ADULT_BILLING_PLATFORMS as readonly string[]).includes(pid)) return false
  if (billingVariant === 'multi') return false
  if (billingVariant !== 'single') return false

  const allowedList =
    allowedPlatforms?.length && allowedPlatforms.length <= 2
      ? sortFocusPlatforms(allowedPlatforms)
      : []
  const allowed = new Set<string>(allowedList.length ? allowedList : ['onlyfans'])

  const adult = new Set<string>(connectedAdultPlatforms(connections))
  adult.add(pid)

  for (const a of adult) {
    if (!allowed.has(a)) return true
  }
  return false
}

/**
 * Block dashboard “Connect” when an active subscription is Focus and the new platform is outside allowance.
 * (Unified = no block here; no subscription row = no block.)
 */
export function adultPlatformConnectBlockedByFocusPlan(
  connections: PlatformConnectionLike[],
  sub: SubscriptionFocusFields | null | undefined,
  platformIdToConnect: string,
): boolean {
  if (!sub) return false
  const st = (sub.status || '').toLowerCase()
  if (!SUBSCRIPTION_STATUSES_ENFORCING_FOCUS.has(st)) return false
  const variant = effectiveBillingVariant(sub)
  const allowed = resolveAllowedFocusPlatforms(sub.billing_focus_platforms, sub.billing_focus_platform)
  return focusUpgradeRequired(connections, variant, allowed, platformIdToConnect)
}
