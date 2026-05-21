import fs from 'fs'

function replacePrefixUntil(file, keepFromNeedle, head) {
  const s = fs.readFileSync(file, 'utf8')
  const keep = s.indexOf(keepFromNeedle)
  if (keep === -1) throw new Error(`marker not found: ${file}`)
  fs.writeFileSync(file, head + s.slice(keep))
}

// NOTE: /pricing metadata is maintained in-repo with next-intl (`messages/*/marketing.json`).

replacePrefixUntil(
  'app/[locale]/(marketing)/launch-list/page.tsx',
  'export default function LaunchListPage',
  `import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { MobileLaunchListForm } from '@/components/marketing/mobile-launch-list-form'
import { cn } from '@/lib/utils'

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/launch-list',
    title: 'Mobile Launch List | Circe et Venus',
    description:
      'Join the Circe et Venus mobile launch list. Get first access to iOS and Android release updates.',
    keywords: [
      'Circe et Venus launch list',
      'mobile waitlist',
      'iOS creator app',
      'Android creator app',
      'mobile app early access',
    ],
  })
}

`,
)

replacePrefixUntil(
  'app/[locale]/(marketing)/mobile-app/page.tsx',
  'const launchPillars',
  `import Link from 'next/link'
import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { Button } from '@/components/ui/button'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { ArrowRight, Smartphone, Sparkles } from 'lucide-react'

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/mobile-app',
    title: 'Mobile App | Circe et Venus',
    description:
      'Circe et Venus mobile app is coming soon. Preview the iOS/Android experience for messages, AI Studio, protection, analytics, and Divine Manager.',
    keywords: [
      'Circe et Venus mobile app',
      'creator app coming soon',
      'OnlyFans mobile manager',
      'Fansly mobile app',
      'Divine Manager mobile',
      'AI Studio mobile',
    ],
  })
}

`,
)
