import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/privacy',
  title: 'Privacy Policy | Circe et Venus',
  description:
    'Privacy Policy for Circe et Venus (Creatix): how we collect, use, and protect creator and account data; cookies; and your rights.',
  keywords: ['Circe et Venus privacy', 'Creatix privacy policy', 'creator data protection'],
})

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
