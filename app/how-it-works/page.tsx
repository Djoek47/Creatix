import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { PricingModelMarketingSection } from '@/components/marketing/pricing-model-marketing-section'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, Moon, Sun, Star, Shield, TrendingUp, 
  Users, Link2, Calendar, MessageSquare, BarChart3,
  Sparkles, Check, Zap
} from 'lucide-react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/how-it-works',
  title: 'How It Works | Circe et Venus',
  description:
    'Connect OnlyFans and Fansly, open Divine Manager, and use Circe (retention & protection) and Venus (fans & growth) with AI Studio — step-by-step how Circe et Venus works today.',
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
      title: 'Connect your platforms',
      description:
        'Link OnlyFans and Fansly for DMs, fans, and sync. ManyVids is on Unified billing when you choose that tier — see Pricing for Focus vs Unified.',
      icon: Link2,
      color: 'primary',
    },
    {
      number: '02',
      title: 'Meet Your AI Guides',
      description: 'Circe analyzes your retention patterns while Venus identifies growth opportunities. Two divine intelligences working for you.',
      icon: Star,
      color: 'primary',
    },
    {
      number: '03',
      title: 'Get Personalized Insights',
      description: 'Receive AI-powered recommendations for content, pricing, and engagement strategies tailored to your unique audience.',
      icon: Sparkles,
      color: 'primary',
    },
    {
      number: '04',
      title: 'Grow Your Empire',
      description: 'Watch your fan base grow and retention improve as you follow divine guidance. Track everything on your dashboard.',
      icon: TrendingUp,
      color: 'primary',
    },
  ]

  const features = [
    {
      title: 'Circe — Retention & protection',
      description: 'Analytics, Retention, and Protection in the app — same names as the sidebar.',
      icon: Moon,
      color: 'circe',
      items: [
        'Churn signals and retention digests (AI Studio + Retention hub)',
        'Income predictor and dashboard snapshots',
        'Leak alerts, scan scheduling, and DMCA drafts you review before sending',
      ],
    },
    {
      title: 'Venus — Growth & fans',
      description: 'Fans, Commenter (housekeeping), and Mentions — CRM and public signals together.',
      icon: Sun,
      color: 'venus',
      items: [
        'Fan CRM, segments, and smart lists synced to platforms',
        'Commenter: scored replies, review-only posting',
        'Mentions and reputation off the main feed',
      ],
    },
  ]

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background constellation-bg">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <ThemedLogo 
              width={36} 
              height={36} 
              className="rounded-full sm:h-10 sm:w-10"
              priority
            />
            <span className="hidden font-serif text-lg font-semibold tracking-wider text-primary sm:inline sm:text-xl">CIRCE ET VENUS</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/about">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                About
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14 sm:pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          </div>
          
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4 gap-1">
              <Sparkles className="h-3 w-3" />
              Simple Setup
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              How <span className="text-primary">Circe et Venus</span> Works
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Get started in minutes and let divine AI guide your creator journey. 
              Here is how our platform transforms your business.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="space-y-12">
              {steps.map((step, index) => (
                <div 
                  key={step.number}
                  className={`flex flex-col gap-6 lg:flex-row lg:items-center ${
                    index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-bold text-primary/30">{step.number}</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
                    <h3 className="text-2xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="flex items-center justify-center lg:w-48">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                      <step.icon className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Guides */}
        <section className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Your Divine AI Guides
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Two specialized AIs working together to maximize your success.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {features.map((feature) => (
                <div 
                  key={feature.title}
                  className={`rounded-2xl border p-8 ${
                    feature.color === 'circe' 
                      ? 'border-circe/30 bg-gradient-to-br from-circe/10 to-transparent' 
                      : 'border-venus/30 bg-gradient-to-br from-venus/10 to-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-3 ${
                      feature.color === 'circe' ? 'bg-circe/20' : 'bg-venus/20'
                    }`}>
                      <feature.icon className={`h-8 w-8 ${
                        feature.color === 'circe' ? 'text-circe-light' : 'text-venus'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${
                        feature.color === 'circe' ? 'text-circe-light' : 'text-venus'
                      }`}>{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-foreground/80">
                        <Check className={`h-5 w-5 ${
                          feature.color === 'circe' ? 'text-circe-light' : 'text-venus'
                        }`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything You Need
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                A complete suite of tools designed for modern content creators.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Calendar,
                  title: 'Content calendar',
                  description: 'Schedule drops and orchestrate rhythm; optional cosmic framing when you want it.',
                },
                {
                  icon: MessageSquare,
                  title: 'AI Chatter',
                  description: 'Per-fan DM automation (OnlyFans) with review queues and Mimic-aware drafts.',
                },
                {
                  icon: Shield,
                  title: 'Leak protection',
                  description: 'Monitoring, alerts, and DMCA draft workflows — you stay in the loop.',
                },
                {
                  icon: BarChart3,
                  title: 'Analytics',
                  description: 'Revenue, snapshots, and Income Predictor — tied to your connected data.',
                },
                {
                  icon: Users,
                  title: 'Fan CRM',
                  description: 'Segments, spend, tags, and Housekeeping lists synced to platforms.',
                },
                {
                  icon: Zap,
                  title: 'AI Studio',
                  description: 'Library of runnable tools (credits where marked) plus Divine Manager access.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingModelMarketingSection />

        {/* CTA */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-venus/5 p-8 text-center sm:p-12">
            <div className="mb-6 flex justify-center gap-4">
              <div className="rounded-full bg-circe/20 p-3">
                <Moon className="h-8 w-8 text-circe-light" />
              </div>
              <div className="rounded-full bg-venus/20 p-3">
                <Sun className="h-8 w-8 text-venus" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to Transform Your Creator Business?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Start a trial, connect a platform, and open Divine Manager — the same stack described on Features.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg" className="px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/30 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <ThemedLogo width={32} height={32} className="rounded-full" />
              <span className="font-serif font-semibold tracking-wider text-primary">CIRCE ET VENUS</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 text-sm sm:gap-6">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
              <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            </nav>
          </div>
          <FooterSupportSocial className="mt-6" />
          <div className="mt-6 border-t border-border/30 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              MMXXVI Circe et Venus Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
