import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

import { HtmlLangUpdater } from '@/components/i18n/html-lang-updater'
import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { negotiatePublicLocale } from '@/lib/i18n/resolve-locale'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = {
  title: `Sign in | ${SITE_NAME}`,
  robots: { index: true, follow: true },
}

export default async function AuthSegmentLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const hdrs = await headers()
  const locale = negotiatePublicLocale(
    cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    hdrs.get('accept-language'),
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
