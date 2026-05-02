import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/about',
  title: 'About | Circe et Venus',
  description:
    'Circe et Venus — one workspace for creators: messages, fans, AI tools, protection, and voice-first control.',
  keywords: ['Circe et Venus', 'Creatix', 'creator platform', 'about'],
})

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children
}
