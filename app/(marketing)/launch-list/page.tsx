import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { MobileLaunchListForm } from '@/components/marketing/mobile-launch-list-form'

export const metadata: Metadata = buildPublicMetadata({
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

export default function LaunchListPage() {
  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/16 via-circe/8 to-transparent" />
        </div>
        <div className="mx-auto max-w-3xl">
          <MotionReveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Mobile launch</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              Join the launch list.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Production-ready sign-up for first access to Circe et Venus mobile.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.08} className="mt-8 rounded-3xl border border-primary/25 bg-card/60 p-5 backdrop-blur-sm sm:p-6">
            <MobileLaunchListForm />
          </MotionReveal>
        </div>
      </section>
    </main>
  )
}
