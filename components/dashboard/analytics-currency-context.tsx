'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Phase1Locale } from '@/lib/i18n/routing'
import type { UsdFiatRatesMap } from '@/lib/fx/fetch-usd-fiat-rates'
import { normalizeAnalyticsDisplayCurrency, type AnalyticsDisplayCurrency } from '@/lib/fx/analytics-display-currencies'
import { formatUsdAsAnalyticsDisplay } from '@/lib/fx/format-analytics-money'

export type AnalyticsMoneyContextValue = {
  displayCurrency: AnalyticsDisplayCurrency
  locale: Phase1Locale
  rates: UsdFiatRatesMap | null
  /** Format a USD-normalized API/analytics amount in the user's display currency. */
  formatApiUsd: (amountUsd: number, fractionDigits?: 0 | 2) => string
}

const AnalyticsMoneyContext = createContext<AnalyticsMoneyContextValue | null>(null)

export function AnalyticsCurrencyProvider({
  displayCurrency,
  rates,
  locale,
  children,
}: {
  displayCurrency: string | null | undefined
  rates: UsdFiatRatesMap | null
  locale: Phase1Locale
  children: ReactNode
}) {
  const value = useMemo<AnalyticsMoneyContextValue>(() => {
    const code = normalizeAnalyticsDisplayCurrency(displayCurrency)
    return {
      displayCurrency: code,
      locale,
      rates,
      formatApiUsd: (amountUsd, fractionDigits = 0) =>
        formatUsdAsAnalyticsDisplay(amountUsd, code, locale, rates, fractionDigits),
    }
  }, [displayCurrency, locale, rates])

  return <AnalyticsMoneyContext.Provider value={value}>{children}</AnalyticsMoneyContext.Provider>
}

export function useAnalyticsMoney(): AnalyticsMoneyContextValue {
  const ctx = useContext(AnalyticsMoneyContext)
  if (!ctx) {
    return {
      displayCurrency: 'USD',
      locale: 'en',
      rates: null,
      formatApiUsd: (amountUsd, fractionDigits = 0) =>
        formatUsdAsAnalyticsDisplay(amountUsd, 'USD', 'en', null, fractionDigits),
    }
  }
  return ctx
}
