import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PricingModelMarketingSection } from '@/components/marketing/pricing-model-marketing-section'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Moon,
  Sun,
  Shield,
  TrendingUp,
  Users,
  Link2,
  Calendar,
  MessageSquare,
  BarChart3,
  Sparkles,
  Check,
  Zap,
} from 'lucide-react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'

export const metadata: Metadata = buildPublicMetadata({
  path: '/how-it-works',
  title: 'How It Works | Circe et Venus',
  description:
    'Connect OnlyFans or Fansly, open Divine Manager, and use Circe for retention and protection and Venus for fans and growth — clear steps for Circe et Venus.',
  keywords: [
    'how Circe et Venus works',
    'OnlyFans setup',
    'creator onboarding',
    'AI creator assistant',
    'fan retention',
    'Circe et Venus',
  ],
})

export default function HowItWorksPage() {
  const steps = [
    {
      number: '01',
      title: 'Create your account',
      description:
        'Sign up for a 14-day trial (no card required). You land in the dashboard where billing and integrations live.',
      icon: Sparkles,
    },
    {
      number: '02',
      title: 'Connect your platforms',
      description:
        'Link OnlyFans and/or Fansly in Settings → Integrations. ManyVids is available on Unified billing — see Pricing for Focus vs Unified.',
      icon: Link2,
    },
    {
      number: '03',
      title: 'Open Divine Manager',
      description:
        'Use voice or chat to navigate the product: messages, fans, content, and AI tools — with clear confirmations before anything sensitive sends.',
      icon: MessageSquare,
    },
    {
      number: '04',
      title: 'Use Circe and Venus',
      description:
        'Circe groups retention and protection. Venus groups fans and growth. Both read from the same connected data you already use.',
      icon: TrendingUp,
    },
  ]

  const features = [
    {
      title: 'Circe — Retention and protection',
      description: 'Analytics, Retention, and Protection in the app (sidebar names).',
      icon: Moon,
      color: 'circe' as const,
      items: [
        'Churn signals and retention tools',
        'Income views and dashboard snapshots',
        'Leak alerts and DMCA drafts you approve before sending',
      ],
    },
    {
      title: 'Venus — Fans and growth',
      description: 'Fans, Commenter, and Mentions — CRM and public signals together.',
      icon: Sun,
      color: 'venus' as const,
      items: [
        'Fan CRM, segments, and lists synced where supported',
        'Commenter: draft replies for your review',
        'Mentions and reputation monitoring',
      ],
    },
  ]

  const grid = [
    {
      icon: Calendar,
      title: 'Content calendar',
      description: 'Plan drops and keep a consistent posting rhythm.',
    },
    {
      icon: MessageSquare,
      title: 'Unified inbox',
      description: 'OnlyFans and Fansly messages in one place where connected.',
    },
    {
      icon: Shield,
      title: 'Protection',
      description: 'Leak monitoring and workflows you control.',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Revenue and activity tied to synced platform data.',
    },
    {
      icon: Users,
      title: 'Fan CRM',
      description: 'Segments and spend so you know who to prioritize.',
    },
    {
      icon: Zap,
      title: 'AI Studio',
      description: 'Runnable tools; paid plans include a monthly AI credit pool.',
    },
  ]

  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/12 via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <MotionReveal>
            <Badge className="mb-4 gap-1 border-primary/40 bg-primary/10 px-4 py-1.5 text-primary">
              <Sparkles className="h-3 w-3" />
              Four steps
            </Badge>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              How <span className="text-primary">Circe et Venus</span> works
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
              Connect your adult platforms, then run your day from one dashboard — with voice or text in Divine Manager.
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <MotionReveal key={step.number}>
                <div
                  className={`flex flex-col gap-6 lg:flex-row lg:items-center ${
                    index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-bold text-primary/30">{step.number}</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">{step.title}</h2>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="flex items-center justify-center lg:w-48">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                      <step.icon className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/30 bg-card/30 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Circe and Venus</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Two areas of the product — same account, same data.
            </p>
          </MotionReveal>
          <div className="grid gap-8 lg:grid-cols-2">
            {features.map((feature) => (
              <MotionReveal key={feature.title}>
                <div
                  className={`rounded-2xl border p-8 ${
                    feature.color === 'circe'
                      ? 'border-circe/30 bg-gradient-to-br from-circe/10 to-transparent'
                      : 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full p-3 ${
                        feature.color === 'circe' ? 'bg-circe/20' : 'bg-amber-500/20'
                      }`}
                    >
                      <feature.icon
                        className={`h-8 w-8 ${
                          feature.color === 'circe' ? 'text-circe-light' : 'text-amber-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h3
                        className={`text-xl font-semibold ${
                          feature.color === 'circe' ? 'text-circe-light' : 'text-amber-400'
                        }`}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-foreground/85">
                        <Check
                          className={`h-5 w-5 shrink-0 ${
                            feature.color === 'circe' ? 'text-circe-light' : 'text-amber-400'
                          }`}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">What you get in one workspace</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Core surfaces creators use every week — without a long feature list on the home page.
            </p>
          </MotionReveal>
          <MotionStagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {grid.map((feature) => (
              <MotionStaggerItem key={feature.title}>
                <div className="rounded-xl border border-border bg-card/50 p-6 transition-all hover:border-primary/40 hover:shadow-lg">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      <PricingModelMarketingSection />

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <MotionReveal className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-primary/5 p-8 text-center sm:p-12">
          <div className="mb-6 flex justify-center gap-4">
            <div className="rounded-full bg-circe/20 p-3">
              <Moon className="h-8 w-8 text-circe-light" />
            </div>
            <div className="rounded-full bg-primary/20 p-3">
              <Sun className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Start in minutes</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Open Pricing for numbers, or start the trial and connect a platform first.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="px-8">
                View pricing
              </Button>
            </Link>
          </div>
        </MotionReveal>
      </section>
    </main>
  )
}
