import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/contact',
  title: 'Support | Circe et Venus',
  description:
    'Member support for Creatix — billing, product help, and integrations. Sign in with an active subscription or trial.',
  keywords: ['Circe et Venus support', 'Creatix help', 'member support'],
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
