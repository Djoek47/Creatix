import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = {
  title: `Legal | ${SITE_NAME}`,
  description: `Terms, privacy, cookies, and company information for ${SITE_NAME} (Creatix).`,
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
