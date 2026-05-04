/**
 * Infer marketing/dashboard locale from edge geo headers (IP-derived).
 * Vercel: `x-vercel-ip-country`, `x-vercel-ip-country-region` (ISO 3166-2 subdivision).
 * Cloudflare: `cf-ipcountry`. AWS (CloudFront): `cloudfront-viewer-country`, `cloudfront-viewer-country-region`.
 *
 * Priority is applied in {@link negotiatePublicLocale}: cookie → geo → Accept-Language → en.
 */
import type { Phase1Locale } from '@/lib/i18n/routing'

export type GeoHints = { country: string; region?: string }

/** Unknown / VPN / withheld / Tor (varies by provider) */
const INVALID_COUNTRY = new Set(['', 'XX', 'T1', 'ZZ'])

/** English-dominant locales we map explicitly (others fall through to Accept-Language). */
const EN_PRIMARY = new Set(['US', 'GB', 'IE', 'AU', 'NZ'])

/** Portuguese */
const PT_PRIMARY = new Set(['BR', 'PT', 'AO', 'MZ', 'GW', 'CV', 'ST', 'TL'])

/** Spanish (Latin America + Spain + common territories) */
const ES_PRIMARY = new Set([
  'MX',
  'ES',
  'AR',
  'CO',
  'PE',
  'VE',
  'CL',
  'EC',
  'GT',
  'CU',
  'BO',
  'DO',
  'HN',
  'PY',
  'SV',
  'NI',
  'CR',
  'PA',
  'UY',
  'PR',
])

/**
 * French — metropolitan + overseas + many African jurisdictions where French is an official UI language.
 * (Imperfect for multilingual countries; cookie / Accept-Language still apply when users switch.)
 */
const FR_PRIMARY = new Set([
  'FR',
  'MC',
  'LU',
  'SN',
  'CI',
  'CM',
  'ML',
  'NE',
  'BF',
  'BJ',
  'TG',
  'GA',
  'CF',
  'TD',
  'CG',
  'CD',
  'MG',
  'RW',
  'BI',
  'DJ',
  'KM',
  'SC',
  'HT',
  'PM',
  'BL',
  'MF',
  'GF',
  'GP',
  'MQ',
  'NC',
  'PF',
  'RE',
  'TF',
  'WF',
  'YT',
])

/** Canadian provinces/territories defaulting to English (Quebec handled separately → fr). */
const CA_EN_REGIONS = new Set([
  'ON',
  'BC',
  'AB',
  'MB',
  'SK',
  'NS',
  'NB',
  'PE',
  'NL',
  'NT',
  'NU',
  'YT',
])

/** Normalize to ISO 3166-1 alpha-2; reject garbage so we always fall back cleanly to Accept-Language. */
export function normalizeCountryCode(raw: string | undefined | null): string | null {
  if (raw == null || !String(raw).trim()) return null
  let c = String(raw).trim().toUpperCase()
  if (c === 'UK') c = 'GB'
  if (!/^[A-Z]{2}$/.test(c)) return null
  return c
}

/** Some CDNs send `QC`, others `CA-QC` — we only need the subdivision suffix for Canada. */
export function normalizeGeoRegion(region: string | undefined): string | undefined {
  if (!region?.trim()) return undefined
  const u = region.trim().toUpperCase()
  let out: string
  if (u.length > 3 && u.includes('-')) {
    const last = u.split('-').pop() ?? ''
    out = last.trim().toUpperCase()
  } else {
    out = u
  }
  if (!out || out.length > 12) return undefined
  return out
}

/**
 * Read geo hints from common edge/proxy headers. Returns `null` when country is unknown
 * (localhost, missing headers, VPN anonymized, invalid code) — callers then use Accept-Language.
 *
 * **Local dev:** set `CREATIX_GEO_TEST_COUNTRY=BR` (and optional `CREATIX_GEO_TEST_REGION=QC`)
 * in `.env.local` when `NODE_ENV=development` to simulate a region without a VPN.
 */
export function readGeoFromHeaders(headers: { get(name: string): string | null }): GeoHints | null {
  const rawCountry =
    headers.get('x-vercel-ip-country') ||
    headers.get('cf-ipcountry') ||
    headers.get('cloudfront-viewer-country') ||
    ''

  let country = normalizeCountryCode(rawCountry)
  let region: string | undefined = normalizeGeoRegion(
    headers.get('x-vercel-ip-country-region') ||
      headers.get('cloudfront-viewer-country-region') ||
      undefined,
  )

  if ((!country || INVALID_COUNTRY.has(country)) && process.env.NODE_ENV === 'development') {
    const test = normalizeCountryCode(process.env.CREATIX_GEO_TEST_COUNTRY)
    if (test && !INVALID_COUNTRY.has(test)) {
      country = test
      region =
        normalizeGeoRegion(process.env.CREATIX_GEO_TEST_REGION) ??
        region
    }
  }

  if (!country || INVALID_COUNTRY.has(country)) return null

  return { country, region }
}

/**
 * Map country (+ optional ISO 3166-2 region) to a phase-1 locale, or `undefined` to use Accept-Language.
 */
export function localeFromGeo(country: string, region?: string): Phase1Locale | undefined {
  const c = normalizeCountryCode(country)
  if (!c) return undefined
  const r = region?.trim().toUpperCase()

  if (c === 'CA' && r) {
    if (r === 'QC') return 'fr'
    if (CA_EN_REGIONS.has(r)) return 'en'
  }

  if (PT_PRIMARY.has(c)) return 'pt'
  if (ES_PRIMARY.has(c)) return 'es'
  if (FR_PRIMARY.has(c)) return 'fr'
  if (EN_PRIMARY.has(c)) return 'en'

  return undefined
}
