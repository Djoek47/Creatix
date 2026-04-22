import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/privacy',
  title: 'Privacy Policy | Circe et Venus',
  description:
    'Privacy Policy for Circe et Venus (last updated April 26, 2026): how we collect, use, and protect personal information; cookies and tracking; AI; US state disclosures; and your rights.',
  keywords: ['Circe et Venus privacy', 'Creatix privacy policy', 'creator data protection'],
})

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
