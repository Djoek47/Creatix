import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = {
  ...buildPublicMetadata({
    path: '/auth/sign-up-success',
    title: 'Check your email | Circe et Venus',
    description:
      'Confirm your email to finish setting up your Circe et Venus (Creatix) account.',
    keywords: ['Circe et Venus email confirmation'],
  }),
  robots: { index: false, follow: true },
}

export default function SignUpSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
