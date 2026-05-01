import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { isPhase1Locale, negotiatePublicLocale } from '@/lib/i18n/resolve-locale'

type UiPreferencesShape = {
  locale?: string | null
  dateFormat?: string | null
  currency?: string | null
} | null

const COOKIE_ATTRS = {
  path: '/' as const,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax' as const,
}

/**
 * Keep `CREATIX_LOCALE` aligned with anonymous negotiation and authenticated profile locale.
 */
export async function syncCreatixLocaleCookie(opts: {
  request: NextRequest
  response: NextResponse
  supabase: SupabaseClient
  user: User | null
  pathname: string
}): Promise<void> {
  const { request, response, supabase, user, pathname } = opts

  if (pathname.startsWith('/dashboard') && user?.id) {
    const { data } = await supabase
      .from('profiles')
      .select('ui_preferences')
      .eq('id', user.id)
      .maybeSingle()

    const prefs = data?.ui_preferences as UiPreferencesShape
    const fromProfile = prefs?.locale
    if (isPhase1Locale(fromProfile)) {
      response.cookies.set(LOCALE_COOKIE, fromProfile, COOKIE_ATTRS)
      return
    }
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/auth')) {
    const existing = request.cookies.get(LOCALE_COOKIE)?.value ?? null
    if (!isPhase1Locale(existing)) {
      response.cookies.set(
        LOCALE_COOKIE,
        negotiatePublicLocale(existing, request.headers.get('accept-language')),
        COOKIE_ATTRS,
      )
    }
  }
}
