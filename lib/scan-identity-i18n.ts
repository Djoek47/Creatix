import type { ScanIdentityHandleRow } from '@/hooks/use-scan-identity'
import { normalizeScanHandle, scanSourcePlatformKey } from '@/lib/scan-identity'

type DashboardT = (key: string, values?: Record<string, string | number>) => string

const KNOWN_PLATFORM_KEYS = new Set([
  'onlyfans',
  'fansly',
  'manyvids',
  'loyalfans',
  'twitter',
  'instagram',
  'tiktok',
])

function platformWord(platformKey: string, t: DashboardT): string {
  if (KNOWN_PLATFORM_KEYS.has(platformKey)) {
    return t(`scanIdentity.platforms.${platformKey}`)
  }
  return platformKey.replace(/_/g, ' ')
}

/**
 * Localized handle line for pickers — mirrors {@link loadScanIdentityHandles} label shapes.
 */
export function formatScanIdentityHandleLabel(
  row: Pick<ScanIdentityHandleRow, 'source' | 'value'>,
  t: DashboardT,
): string {
  const handle = normalizeScanHandle(row.value)
  const src = row.source

  if (src === 'former') {
    return t('scanIdentity.labelFormer', { handle })
  }
  if (src === 'reputation_manual') {
    return t('scanIdentity.labelManualSearch', { handle })
  }
  if (src.startsWith('social_')) {
    const plat = src.slice('social_'.length)
    return t('scanIdentity.labelSocialProfile', {
      platform: platformWord(plat, t),
      manual: t('scanIdentity.manualParen'),
      handle,
    })
  }
  if (src.startsWith('reputation_')) {
    const k = src.slice('reputation_'.length)
    return t('scanIdentity.labelPlatformAt', {
      platform: platformWord(k, t),
      handle,
    })
  }
  return t('scanIdentity.labelPlatformAt', {
    platform: platformWord(src, t),
    handle,
  })
}

export function translatedScanSourcePlatformDisplayName(source: string, t: DashboardT): string {
  const key = scanSourcePlatformKey(source)
  if (key === 'former') return t('scanIdentity.sources.former')
  if (key === 'manual') return t('scanIdentity.sources.manual')
  return platformWord(key, t)
}
