export const ANALYTICS_DISPLAY_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

export type AnalyticsDisplayCurrency = (typeof ANALYTICS_DISPLAY_CURRENCIES)[number]

export function normalizeAnalyticsDisplayCurrency(
  code: string | null | undefined,
): AnalyticsDisplayCurrency {
  if (code && (ANALYTICS_DISPLAY_CURRENCIES as readonly string[]).includes(code)) {
    return code as AnalyticsDisplayCurrency
  }
  return 'USD'
}
