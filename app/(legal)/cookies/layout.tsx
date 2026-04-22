import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/cookies',
  title: 'Cookie Policy | Circe et Venus',
  description:
    'Cookie Policy for Circe et Venus (updated April 21, 2026): cookies and similar technologies on circeetvenus.com, browser controls, and how to contact us.',
  keywords: ['Circe et Venus cookies', 'Creatix cookie policy', 'website cookies'],
})

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
