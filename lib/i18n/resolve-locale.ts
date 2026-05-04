import type { GeoHints } from '@/lib/i18n/locale-from-geo'
import { localeFromGeo } from '@/lib/i18n/locale-from-geo'
import { PHASE1_LOCALES, type Phase1Locale } from '@/lib/i18n/routing'

export function isPhase1Locale(value: string | null | undefined): value is Phase1Locale {
  return value != null && (PHASE1_LOCALES as readonly string[]).includes(value)
}

/**
 * Parse Accept-Language and return first supported phase-1 locale, if any.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Phase1Locale | undefined {
  if (!header?.trim()) return undefined
  const parts = header.split(',')
  for (const part of parts) {
    const code = part.split(';')[0]?.trim().toLowerCase()
    if (!code) continue
    const base = code.split('-')[0]
    if (isPhase1Locale(base)) return base
    if (code === 'pt-br' || code === 'pt_pt') return 'pt'
  }
  return undefined
}

/**
 * Anonymous / middleware path: cookie, then geo (Vercel/Cloudflare country/region), then Accept-Language, then English.
 */
export function negotiatePublicLocale(
  cookieLocale: string | null | undefined,
  acceptLanguage: string | null | undefined,
  geo?: GeoHints | null,
): Phase1Locale {
  if (isPhase1Locale(cookieLocale)) return cookieLocale
  if (geo?.country) {
    const fromGeo = localeFromGeo(geo.country, geo.region)
    if (fromGeo) return fromGeo
  }
  return localeFromAcceptLanguage(acceptLanguage) ?? 'en'
}

/**
 * Authenticated app: profile wins, then same chain as {@link negotiatePublicLocale} (cookie → geo → Accept-Language → en).
 */
export function resolveDashboardLocale(
  profileLocale: string | null | undefined,
  cookieLocale: string | null | undefined,
  acceptLanguage: string | null | undefined,
  geo?: GeoHints | null,
): Phase1Locale {
  if (isPhase1Locale(profileLocale)) return profileLocale
  return negotiatePublicLocale(cookieLocale, acceptLanguage, geo)
}
