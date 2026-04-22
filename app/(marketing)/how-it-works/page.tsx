import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Link2, Mic, Sparkles, TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'

export const metadata: Metadata = buildPublicMetadata({
  path: '/how-it-works',
  title: 'How It Works | Circe et Venus',
  description:
    'Sign up, connect OnlyFans or Fansly, and run your day from one dashboard with voice-first Divine Manager.',
  keywords: [
    'how Circe et Venus works',
    'OnlyFans setup',
    'creator onboarding',
    'AI creator assistant',
    'fan retention',
    'Circe et Venus',
  ],
})

const steps = [
  { number: '01', title: 'Sign up', desc: '14-day trial. No card.', icon: Sparkles },
  { number: '02', title: 'Connect', desc: 'OnlyFans and/or Fansly.', icon: Link2 },
  { number: '03', title: 'Speak', desc: 'Divine Manager runs it.', icon: Mic },
  { number: '04', title: 'Grow', desc: 'Retention, fans, revenue.', icon: TrendingUp },
]

export default function HowItWorksPage() {
  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/12 via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <MotionReveal>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Four <span className="text-primary">steps.</span>
            </h1>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-5xl">
          <MotionStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
            {steps.map((step) => (
              <MotionStaggerItem key={step.number}>
                <div className="h-full rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-2xl font-bold text-primary/40">{step.number}</span>
                    <div className="inline-flex rounded-xl bg-primary/15 p-3 text-primary">
                      <step.icon className="h-5 w-5" aria-hidden />
                    </div>
                  </div>
                  <h2 className="mt-5 font-serif text-xl font-semibold">{step.title}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <MotionReveal className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-primary/5 p-10 text-center sm:p-12">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Ready?</h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="h-12 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-primary-foreground shadow-lg">
                Start free trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="h-12 rounded-full border-primary/35 px-10">
                Pricing
              </Button>
            </Link>
          </div>
        </MotionReveal>
      </section>
    </main>
  )
}
