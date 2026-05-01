import { MANYVIDS_LOGO_SRC } from '@/lib/platform-logos'

/**
 * Clip / fan-market storefronts surfaced on the ManyVids Focus add-on row (billing estimate).
 * Logos live in `/public`.
 */
export const CLIP_FOCUS_ADDON_CAROUSEL = [
  { id: 'manyvids', label: 'ManyVids', logoSrc: MANYVIDS_LOGO_SRC },
  { id: 'clips4sale', label: 'Clips4Sale', logoSrc: '/clips4sale-logo.png' },
  { id: 'fanvue', label: 'Fanvue', logoSrc: '/fanvue-logo.png' },
  { id: 'loyalfans', label: 'Loyalfans', logoSrc: '/loyalfans-logo.svg' },
  { id: 'mym', label: 'MYM', logoSrc: '/mym-logo.png' },
] as const

export type ClipFocusAddonCarouselItem = (typeof CLIP_FOCUS_ADDON_CAROUSEL)[number]

/**
 * Billing anti‑piracy Bundled row + pricing calculator aside: one storefront at a time.
 * Copy under the logo must stay on this label order (synced with `BundledAntipiracyStorefrontLogoMark` + caption accents).
 */
export const BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE = [
  {
    id: 'manyvids',
    displayLabel: 'ManyVids',
    logoSrc: MANYVIDS_LOGO_SRC,
    width: 40,
    height: 40,
    glowStyle:
      'drop-shadow(0 0 14px rgba(229, 57, 53, 0.55)) drop-shadow(0 0 26px rgba(198, 40, 40, 0.3))',
    /** Matches logo glow — caption platform word + soft halo */
    captionAccentClass:
      'text-red-400 [text-shadow:0_0_16px_rgba(229,57,53,0.45)] dark:text-red-300 dark:[text-shadow:0_0_18px_rgba(248,113,113,0.35)]',
  },
  {
    id: 'mym',
    displayLabel: 'MYM',
    logoSrc: '/mym-logo.png',
    width: 96,
    height: 36,
    glowStyle:
      'drop-shadow(0 0 14px rgba(236, 72, 153, 0.42)) drop-shadow(0 0 26px rgba(168, 85, 247, 0.28))',
    captionAccentClass:
      'text-fuchsia-400 [text-shadow:0_0_16px_rgba(168,85,247,0.42)] dark:text-fuchsia-300 dark:[text-shadow:0_0_18px_rgba(217,70,239,0.35)]',
  },
  {
    id: 'fanvue',
    displayLabel: 'Fanvue',
    logoSrc: '/fanvue-logo.png',
    width: 112,
    height: 34,
    glowStyle:
      'drop-shadow(0 0 14px rgba(0, 212, 169, 0.5)) drop-shadow(0 0 28px rgba(0, 212, 169, 0.22))',
    captionAccentClass:
      'text-emerald-400 [text-shadow:0_0_18px_rgba(0,212,169,0.5)] dark:text-emerald-300 dark:[text-shadow:0_0_20px_rgba(52,211,153,0.4)]',
  },
  {
    id: 'loyalfans',
    displayLabel: 'LoyalFans',
    logoSrc: '/loyalfans-logo.svg',
    width: 132,
    height: 34,
    glowStyle:
      'drop-shadow(0 0 14px rgba(229, 57, 53, 0.45)) drop-shadow(0 0 26px rgba(255, 112, 67, 0.25))',
    captionAccentClass:
      'text-orange-400 [text-shadow:0_0_16px_rgba(255,112,67,0.42)] dark:text-orange-300 dark:[text-shadow:0_0_18px_rgba(251,146,60,0.35)]',
  },
] as const

export type BundledAntipiracyStorefrontSlide = (typeof BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE)[number]
