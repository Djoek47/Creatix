import { cookies, headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { readGeoFromHeaders } from '@/lib/i18n/locale-from-geo'
import { resolveDashboardLocale } from '@/lib/i18n/resolve-locale'
import type { Phase1Locale } from '@/lib/i18n/routing'
import type { UiPreferences } from '@/lib/types'

/**
 * Locale for Stripe line-item copy: profile preference, then locale cookie, then Accept-Language.
 */
export async function resolveCheckoutLocaleForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Phase1Locale> {
  const [cookieStore, hdrs] = await Promise.all([cookies(), headers()])
  const { data: profile } = await supabase.from('profiles').select('ui_preferences').eq('id', userId).maybeSingle()
  const uiPrefs = profile?.ui_preferences as UiPreferences | null
  const geo = readGeoFromHeaders(hdrs)
  return resolveDashboardLocale(
    uiPrefs?.locale ?? null,
    cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    hdrs.get('accept-language'),
    geo,
  )
}
