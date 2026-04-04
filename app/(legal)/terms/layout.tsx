import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/terms',
  title: 'Terms of Service & User Agreement | Circe et Venus',
  description:
    'Terms of Service and User Agreement for Circe et Venus (Creatix). Adult creator platform rules, billing, acceptable use, and liability. Effective April 1, 2026.',
  keywords: [
    'Circe et Venus terms',
    'Creatix terms of service',
    'creator platform terms',
    'adult creator SaaS terms',
  ],
})

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
