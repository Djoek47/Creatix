import { MarketingSiteChrome } from '@/components/marketing/marketing-site-chrome'
import type { ReactNode } from 'react'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingSiteChrome>{children}</MarketingSiteChrome>
}
