import { getTranslations } from 'next-intl/server'

import type { Phase1Locale } from '@/lib/i18n/routing'
import {
  getTierByIndex,
  normalizeCheckoutFocusPlatforms,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'

type BillingT = Awaited<ReturnType<typeof getTranslations>>
type CheckoutPlatformKey = `checkout.platform.${AdultBillingPlatform}`

function platformLabel(p: AdultBillingPlatform, t: BillingT): string {
  return t(`checkout.platform.${p}` as CheckoutPlatformKey)
}

function focusShortLocalized(fps: AdultBillingPlatform[], t: BillingT): string {
  if (fps.length === 0) return t('checkout.platform.onlyfans')
  if (fps.length === 1) return platformLabel(fps[0], t)
  return fps.map((p) => platformLabel(p, t)).join(t('checkout.platformJoiner'))
}

export async function checkoutProductNameForLocale(
  locale: Phase1Locale,
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms?: AdultBillingPlatform[] | null,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'billing' })
  const row = getTierByIndex(tierIndex)
  if (!row) return t('checkout.fallbackName')
  const band = t(`checkout.tierBands.${tierIndex}` as never)
  if (variant === 'multi') {
    return t('checkout.nameBundled', { band })
  }
  const fps = normalizeCheckoutFocusPlatforms(focusPlatforms ?? undefined)
  const focus = focusShortLocalized(fps, t)
  return t('checkout.nameFocus', { focus, band })
}

export async function checkoutProductDescriptionForLocale(
  locale: Phase1Locale,
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms?: AdultBillingPlatform[] | null,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'billing' })
  const row = getTierByIndex(tierIndex)
  if (!row) return t('checkout.fallbackDescription')
  const band = t(`checkout.tierBands.${tierIndex}` as never)
  if (variant === 'multi') {
    return t('checkout.descriptionBundled', { band })
  }
  const fps = normalizeCheckoutFocusPlatforms(focusPlatforms ?? undefined)
  if (fps.length === 1) {
    return t('checkout.descriptionSingle', { band, platform: platformLabel(fps[0], t) })
  }
  return t('checkout.descriptionDual', {
    band,
    p0: platformLabel(fps[0], t),
    p1: platformLabel(fps[1], t),
  })
}
