import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { MarketingSiteChrome } from '@/components/marketing/marketing-site-chrome'
import { MarketingSiteWideJsonLd } from '@/components/marketing/marketing-site-wide-json-ld'
import { SEO_PRIMARY_LOCALE } from '@/lib/seo-public-paths'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })

  return {
    title: t('metadataDefaultTitle', { siteName: SITE_NAME }),
  }
}

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params

  return (
    <MarketingSiteChrome>
      {locale === SEO_PRIMARY_LOCALE ? <MarketingSiteWideJsonLd /> : null}
      {children}
    </MarketingSiteChrome>
  )
}
