import { getRequestConfig } from 'next-intl/server'
import type { IntlError } from 'use-intl'
import { cookies, headers } from 'next/headers'

import { routing } from '@/lib/i18n/routing'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import {
  applyPseudoLocalization,
  loadAppMessages,
  mergeEnglishFallback,
} from '@/lib/i18n/load-messages'
import { readGeoFromHeaders } from '@/lib/i18n/locale-from-geo'
import { negotiatePublicLocale, isPhase1Locale } from '@/lib/i18n/resolve-locale'

/** Accepts middleware-provided `[locale]` segment when present. */
export default getRequestConfig(async ({ requestLocale }) => {
  const segmentLocale = await requestLocale
  const { get } = await cookies()
  const hdrs = await headers()

  const cookieLocale = get(LOCALE_COOKIE)?.value ?? null
  const acceptLang = hdrs.get('accept-language')

  let locale: Phase1Locale

  const segmentIncluded =
    !!segmentLocale && (routing.locales as readonly string[]).includes(segmentLocale)

  if (segmentIncluded && isPhase1Locale(segmentLocale)) {
    locale = segmentLocale
  } else {
    const geo = readGeoFromHeaders(hdrs)
    locale = negotiatePublicLocale(cookieLocale, acceptLang, geo)
  }

  const [primary, englishBase] =
    locale === 'en'
      ? [await loadAppMessages('en'), null]
      : await Promise.all([loadAppMessages(locale), loadAppMessages('en')])

  let messages = englishBase ? mergeEnglishFallback(englishBase, primary) : primary
  messages = applyPseudoLocalization(messages)

  return {
    locale,
    messages,
    onError(error: IntlError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[i18n]', error.code, error.message)
      }
    },
    getMessageFallback({
      namespace,
      key,
      error,
    }: {
      namespace?: string
      key: string
      error: IntlError
    }) {
      if (error.code === 'MISSING_MESSAGE' && process.env.NODE_ENV !== 'production') {
        console.warn('[i18n] missing message', namespace, key)
      }
      const path = [namespace, key].filter(Boolean).join('.')
      return path || key
    },
  }
})
