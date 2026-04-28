import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = {
  title: `Sign in | ${SITE_NAME}`,
  robots: { index: true, follow: true },
}

export default function AuthSegmentLayout({ children }: { children: React.ReactNode }) {
  return children
}
