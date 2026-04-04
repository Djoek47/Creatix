import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/auth/forgot-password',
  title: 'Forgot password | Circe et Venus',
  description:
    'Reset your Circe et Venus (Creatix) password — we will email you a secure link.',
  keywords: ['Circe et Venus password reset'],
})

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
