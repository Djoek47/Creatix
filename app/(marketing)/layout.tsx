import { MarketingSiteChrome } from '@/components/marketing/marketing-site-chrome'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

/** Default document title when a child route omits one (rare). */
export const metadata: Metadata = {
  title: `${SITE_NAME} — Divine creator OS`,
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingSiteChrome>{children}</MarketingSiteChrome>
}
