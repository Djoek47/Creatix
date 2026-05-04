import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies, headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { HtmlLangUpdater } from '@/components/i18n/html-lang-updater'
import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { readGeoFromHeaders } from '@/lib/i18n/locale-from-geo'
import { negotiatePublicLocale } from '@/lib/i18n/resolve-locale'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = {
  title: `Legal | ${SITE_NAME}`,
  description: `Terms, privacy, cookies, and company information for ${SITE_NAME} (Creatix).`,
}

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const hdrs = await headers()
  const geo = readGeoFromHeaders(hdrs)
  const locale = negotiatePublicLocale(
    cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    hdrs.get('accept-language'),
    geo,
  )
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangUpdater />
      {children}
    </NextIntlClientProvider>
  )
}
