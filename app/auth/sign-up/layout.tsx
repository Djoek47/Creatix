import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/auth/sign-up',
  title: 'Sign up | Circe et Venus',
  description:
    'Create your Circe et Venus account — 2-day trial (credit card required). AI-powered creator OS: Divine Manager, Circe, Venus, CRM, and platform tools.',
  keywords: ['Circe et Venus sign up', 'Creatix free trial', 'creator platform register'],
  index: false,
})

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children
}
