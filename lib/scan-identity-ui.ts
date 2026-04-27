import { scanSourcePlatformKey } from '@/lib/scan-identity'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'

export type ScanIdentityBrandMark =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'initials'; text: string }
  | { kind: 'special'; type: 'former' | 'manual' }

/** Same PNG marks as the marketing home hero (`lib/platform-logos`). */
export function scanIdentityBrandMarkForSource(source: string): ScanIdentityBrandMark {
  const key = scanSourcePlatformKey(source)
  switch (key) {
    case 'onlyfans':
      return { kind: 'image', src: ONLYFANS_LOGO_SRC, alt: 'OnlyFans' }
    case 'fansly':
      return { kind: 'image', src: FANSLY_LOGO_SRC, alt: 'Fansly' }
    case 'loyalfans':
      return { kind: 'image', src: '/loyalfans-logo.svg', alt: 'LoyalFans' }
    case 'mym':
      return { kind: 'image', src: '/mym-logo.png', alt: 'MYM' }
    case 'twitter':
      return { kind: 'initials', text: 'X' }
    case 'instagram':
      return { kind: 'initials', text: 'IG' }
    case 'tiktok':
      return { kind: 'initials', text: 'TT' }
    case 'manyvids':
      return { kind: 'initials', text: 'MV' }
    case 'former':
      return { kind: 'special', type: 'former' }
    case 'manual':
      return { kind: 'special', type: 'manual' }
    default:
      return { kind: 'initials', text: key.slice(0, 2).toUpperCase() }
  }
}
