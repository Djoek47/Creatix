import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = {
  ...buildPublicMetadata({
    path: '/auth/sign-up-success',
    title: 'Finish setup | Circe et Venus',
    description:
      'Confirm your email and activate your trial wallet for Circe et Venus (Creatix).',
    keywords: ['Circe et Venus signup', 'Creatix email confirmation', 'creator trial'],
  }),
  robots: { index: false, follow: true },
}

export default function SignUpSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
