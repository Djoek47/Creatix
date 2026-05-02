import { MANYVIDS_LOGO_SRC } from '@/lib/platform-logos'

export type PricingCyclePlatformMark = {
  id: string
  name: string
  logoSrc: string
}

/**
 * Storefront marks for the hero “pricing platforms” teaser.
 * OnlyFans / Fansly are omitted here—they appear elsewhere on the home hero.
 */
export const PRICING_HERO_PLATFORM_CYCLE: readonly PricingCyclePlatformMark[] = [
  { id: 'mv', name: 'ManyVids', logoSrc: MANYVIDS_LOGO_SRC },
  { id: 'mym', name: 'MYM', logoSrc: '/mym-logo.png' },
  { id: 'c4s', name: 'Clips4Sale', logoSrc: '/clips4sale-logo.png' },
  { id: 'lf', name: 'LoyalFans', logoSrc: '/loyalfans-logo.svg' },
  { id: 'fv', name: 'Fanvue', logoSrc: '/fanvue-logo.png' },
] as const

/** Same marks cycled inside the Protection column on the home pricing switch. */
export const PRICING_ANTI_PIRACY_CYCLE_LOGOS: readonly PricingCyclePlatformMark[] =
  PRICING_HERO_PLATFORM_CYCLE

/** Match `PricingPageCalculator` bundled footer cadence for storefront marks. */
export const PRICING_HERO_PLATFORM_CYCLE_MS = 2600
