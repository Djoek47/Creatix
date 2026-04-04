import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/auth/login',
  title: 'Log in | Circe et Venus',
  description:
    'Log in to Creatix — Circe et Venus: Divine Manager, AI tools, analytics, and integrations for OnlyFans, Fansly, and more.',
  keywords: ['Circe et Venus login', 'Creatix sign in', 'creator dashboard login'],
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
