import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/about',
  title: 'About Us | Circe et Venus',
  description:
    'Meet the team behind Circe et Venus: AI and tools built for adult creators — retention (Circe), growth (Venus), and a voice-first Divine Manager.',
  keywords: [
    'Circe et Venus about',
    'Creatix company',
    'creator platform team',
    'OnlyFans software company',
  ],
})

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
