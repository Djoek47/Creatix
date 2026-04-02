import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service & User Agreement | Circe et Venus',
  description:
    'Terms of Service and User Agreement for Circe et Venus (circeetvenus.com). Effective April 1, 2026.',
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
