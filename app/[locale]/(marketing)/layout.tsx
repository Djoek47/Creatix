import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { MarketingSiteChrome } from '@/components/marketing/marketing-site-chrome'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })

  return {
    title: t('metadataDefaultTitle', { siteName: SITE_NAME }),
  }
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingSiteChrome>{children}</MarketingSiteChrome>
}
