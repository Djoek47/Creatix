import { defineRouting } from 'next-intl/routing'

/** Phase 1 shipped locales — keep in sync with `messages/` folders. */
export const PHASE1_LOCALES = ['en', 'es', 'pt', 'fr'] as const
export type Phase1Locale = (typeof PHASE1_LOCALES)[number]

export const routing = defineRouting({
  locales: PHASE1_LOCALES,
  defaultLocale: 'en',
  localePrefix: 'always',
  alternateLinks: true,
  localeCookie: {
    name: 'CREATIX_LOCALE',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  },
})

export type AppLocale = Phase1Locale
