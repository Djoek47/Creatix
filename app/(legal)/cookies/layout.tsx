import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/cookies',
  title: 'Cookie Policy | Circe et Venus',
  description:
    'Cookie Policy for Circe et Venus: essential, analytics, and preference cookies on circeetvenus.com and how to control them.',
  keywords: ['Circe et Venus cookies', 'Creatix cookie policy', 'website cookies'],
})

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
