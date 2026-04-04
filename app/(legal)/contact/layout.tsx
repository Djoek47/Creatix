import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/contact',
  title: 'Contact | Circe et Venus',
  description:
    'Contact Circe et Venus support: questions about Creatix, billing, integrations (OnlyFans, Fansly), partnerships, and press.',
  keywords: ['Circe et Venus contact', 'Creatix support', 'creator platform help'],
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
