import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { ArrowRight, Smartphone, Sparkles } from 'lucide-react'

export const metadata: Metadata = buildPublicMetadata({
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

const launchPillars = [
  'Fast inbox actions built for creators on the move.',
  'AI-powered workflows for messages, content, and growth.',
  'Protection-first experience with premium native polish.',
]

export default function MobileAppPage() {
  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-14 pt-14 sm:px-6 sm:pb-18 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/16 via-circe/8 to-transparent" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <MotionReveal>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Smartphone className="h-3.5 w-3.5" aria-hidden />
              Coming soon
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Mobile command center,
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                {' '}
                made for creators.
              </span>
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Circe et Venus mobile is coming soon for iOS and Android. Manage messages, run AI tools, and stay in
              control of your business from anywhere.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.14}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/launch-list">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-circe/90 px-8 text-primary-foreground shadow-xl shadow-primary/20 hover:opacity-[0.97]"
                >
                  Join launch list <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="h-12 rounded-full px-8">
                  Explore web demo
                </Button>
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-18">
        <div className="mx-auto max-w-6xl">
          <MotionReveal>
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.14] via-circe/[0.1] to-fuchsia-400/[0.08] p-8 text-center shadow-xl shadow-primary/10 sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Mobile app</p>
                <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                  Coming
                  <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                    {' '}
                    Soon.
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
                  A premium native experience is on the way. Join the launch list to get first access when Circe et
                  Venus mobile goes live.
                </p>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 via-card/70 to-primary/[0.06] p-6 sm:p-8">
          <MotionReveal>
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Launch foundation</h2>
            <ul className="mt-5 space-y-2.5">
              {launchPillars.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-foreground/90 sm:text-base">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </MotionReveal>
        </div>
      </section>
    </main>
  )
}
