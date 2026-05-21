/** Sync with `localeCookie.name` in `lib/i18n/routing.ts` and next-intl middleware. */
export const LOCALE_COOKIE = 'CREATIX_LOCALE'

/** Default namespaces merged for app shell (dashboard, auth, onboarding). */
export const APP_MESSAGE_NAMESPACES = [
  'common',
  'navigation',
  'dashboard',
  'billing',
  'auth',
  'errors',
  'ai-tools',
  'onboarding',
  'settings',
  'toasts',
] as const

/** Marketing pages load a smaller bundle. */
export const MARKETING_MESSAGE_NAMESPACES = [
  'common',
  'navigation',
  'marketing',
  'auth',
  'errors',
] as const

export type AppMessageNamespace = (typeof APP_MESSAGE_NAMESPACES)[number]
export type MarketingMessageNamespace = (typeof MARKETING_MESSAGE_NAMESPACES)[number]
