import fs from 'fs'
const p = 'app/[locale]/(marketing)/demo/page.tsx'
let s = fs.readFileSync(p, 'utf8')
const i = s.indexOf('const capabilities')
if (i === -1) throw new Error('marker')
const head = `import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Link2,
  MessageSquare,
  Mic,
  Shield,
  Sparkles,
  TrendingUp,
  Workflow,
} from 'lucide-react'

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/demo',
    title: 'Demo | Circe et Venus',
    description:
      'Explore a guided Circe et Venus product demo: AI management, creator protection, automation workflows, and growth analytics in one dashboard.',
    keywords: [
      'Circe et Venus demo',
      'creator dashboard demo',
      'OnlyFans AI tools',
      'Fansly automation',
      'DM workflow automation',
      'creator protection demo',
    ],
  })
}

`
fs.writeFileSync(p, head + s.slice(i))
