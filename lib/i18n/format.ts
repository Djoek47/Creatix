import type { Phase1Locale } from '@/lib/i18n/routing'

function intlLocaleForPhase1(locale: Phase1Locale): string {
  if (locale === 'pt') return 'pt-BR'
  if (locale === 'fr') return 'fr-FR'
  return locale === 'es' ? 'es-419' : 'en-US'
}

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  locale: Phase1Locale,
  minimumFractionDigits = 2,
): string {
  try {
    return new Intl.NumberFormat(intlLocaleForPhase1(locale), {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits: minimumFractionDigits,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(minimumFractionDigits)}`
  }
}

export function formatNumber(value: number, locale: Phase1Locale, fractionDigits?: number): string {
  try {
    return new Intl.NumberFormat(intlLocaleForPhase1(locale), {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)
  } catch {
    return String(value)
  }
}

export function formatDate(
  input: Date | string | number,
  locale: Phase1Locale,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  const d = input instanceof Date ? input : new Date(input)
  try {
    return new Intl.DateTimeFormat(intlLocaleForPhase1(locale), options).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

export function formatRelativeTime(
  input: Date | string | number,
  locale: Phase1Locale,
  now: Date = new Date(),
): string {
  const d = input instanceof Date ? input : new Date(input)
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000)
  try {
    const rtf = new Intl.RelativeTimeFormat(intlLocaleForPhase1(locale), { numeric: 'auto' })

    const divisions: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
      { unit: 'year', seconds: 60 * 60 * 24 * 365 },
      { unit: 'month', seconds: 60 * 60 * 24 * 30 },
      { unit: 'week', seconds: 60 * 60 * 24 * 7 },
      { unit: 'day', seconds: 60 * 60 * 24 },
      { unit: 'hour', seconds: 60 * 60 },
      { unit: 'minute', seconds: 60 },
      { unit: 'second', seconds: 1 },
    ]

    const abs = Math.abs(diffSec)
    for (const { unit, seconds } of divisions) {
      if (abs >= seconds || unit === 'second') {
        const value = Math.round(diffSec / seconds)
        return rtf.format(value, unit)
      }
    }
    return formatDate(d, locale)
  } catch {
    return formatDate(d, locale)
  }
}
