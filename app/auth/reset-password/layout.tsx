import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/auth/reset-password',
  title: 'Set new password | Circe et Venus',
  description:
    'Choose a new password for your Circe et Venus (Creatix) account.',
  keywords: ['Circe et Venus new password'],
})

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
