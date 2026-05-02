import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies, headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { HtmlLangUpdater } from '@/components/i18n/html-lang-updater'
import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { negotiatePublicLocale } from '@/lib/i18n/resolve-locale'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/about',
  title: 'About | Circe et Venus',
  description:
    'Circe et Venus — one workspace for creators: messages, fans, AI tools, protection, and voice-first control.',
  keywords: ['Circe et Venus', 'Creatix', 'creator platform', 'about'],
})

export default async function AboutLayout({ children }: { children: ReactNode }) {
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
