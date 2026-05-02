import type { Phase1Locale } from '@/lib/i18n/routing'
import { formatCurrencyAmount } from '@/lib/i18n/format'
import { normalizeAnalyticsDisplayCurrency, type AnalyticsDisplayCurrency } from '@/lib/fx/analytics-display-currencies'
import type { UsdFiatRatesMap } from '@/lib/fx/fetch-usd-fiat-rates'

/**
 * Convert a USD amount (from analytics snapshots, CRM, etc.) for display only.
 * Source amounts stay USD in the database; billing remains USD.
 */
export function convertUsdForDisplay(
  amountUsd: number,
  displayCurrency: AnalyticsDisplayCurrency,
  rates: UsdFiatRatesMap | null,
): number {
  if (displayCurrency === 'USD' || !rates) return amountUsd
  const r = rates[displayCurrency]
  if (typeof r !== 'number' || !Number.isFinite(r)) return amountUsd
  return amountUsd * r
}

export function formatUsdAsAnalyticsDisplay(
  amountUsd: number,
  displayCurrency: string | null | undefined,
  locale: Phase1Locale,
  rates: UsdFiatRatesMap | null,
  fractionDigits: 0 | 2 = 0,
): string {
  const code = normalizeAnalyticsDisplayCurrency(displayCurrency)
  const converted = convertUsdForDisplay(amountUsd, code, rates)
  return formatCurrencyAmount(converted, code, locale, fractionDigits)
}
