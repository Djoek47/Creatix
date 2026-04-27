import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import type { Metadata } from 'next'
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

export const metadata: Metadata = buildPublicMetadata({
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

const capabilities = [
  {
    icon: Bot,
    title: 'AI Manager',
    desc: 'Run your daily operator tasks through one command layer and role-aware copilots.',
  },
  {
    icon: MessageSquare,
    title: 'Unified DM Hub',
    desc: 'Handle OnlyFans and Fansly conversations from one context-rich inbox.',
  },
  {
    icon: Shield,
    title: 'Content Protection',
    desc: 'Detect leaks, assemble evidence, and draft takedown actions in minutes.',
  },
  {
    icon: Workflow,
    title: 'Automation Flows',
    desc: 'Trigger recurring actions for outreach, follow-up, and content operations.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Intelligence',
    desc: 'Track conversion, retention, and fan spend signals without spreadsheet chaos.',
  },
  {
    icon: Mic,
    title: 'Voice-first Control',
    desc: 'Use Divine Manager to launch workflows and inspect performance hands-free.',
  },
]

const steps = [
  { number: '01', title: 'Sign up', desc: '2-day trial. Card required.', icon: Sparkles },
  { number: '02', title: 'Connect', desc: 'OnlyFans and/or Fansly.', icon: Link2 },
  { number: '03', title: 'Speak', desc: 'Divine Manager runs it.', icon: Mic },
  { number: '04', title: 'Grow', desc: 'Retention, fans, revenue.', icon: TrendingUp },
]

const demoFlows = [
  {
    label: 'Flow 01',
    title: 'Inbox to Upsell in 90 seconds',
    detail:
      'Segment high-intent fans, generate personalized responses, and queue premium offer follow-ups.',
    bullets: ['Intent scoring appears in DM thread', 'Offer templates adapt to fan profile', 'Follow-ups auto-schedule'],
  },
  {
    label: 'Flow 02',
    title: 'Protection incident response',
    detail:
      'Start from a leak alert and walk through evidence packaging, legal-ready exports, and takedown drafting.',
    bullets: ['Leak source and spread map', 'DMCA packet generated with one review', 'Status tracking from report to removal'],
  },
  {
    label: 'Flow 03',
    title: 'Weekly growth command center',
    detail:
      'Review account health with KPI snapshots, identify churn risk, and trigger next-best actions instantly.',
    bullets: ['Revenue, retention, and fan velocity panels', 'At-risk segment recommendations', 'One-click action runbooks'],
  },
]

export default function DemoPage() {
  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-14 pt-14 sm:px-6 sm:pb-18 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/16 via-circe/8 to-transparent" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <MotionReveal>
            <p className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Product demo
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              See every power move,
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                {' '}
                in one dashboard.
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              No testimonials yet. Instead, we show real product depth: AI management, protection workflows, automation,
              and revenue intelligence working together live.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.14}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="#demo-flows">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-circe/90 px-8 text-primary-foreground shadow-xl shadow-primary/20 hover:opacity-[0.97]"
                >
                  Explore demo flows <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button variant="outline" size="lg" className="h-12 rounded-full px-8">
                  Start free trial
                </Button>
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>

      <section id="how-it-works" className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-8 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
              How it works
            </h2>
          </MotionReveal>
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
                  <h3 className="mt-5 font-serif text-xl font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <MotionStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {capabilities.map((item) => (
              <MotionStaggerItem key={item.title}>
                <article className="h-full rounded-2xl border border-border/60 bg-card/45 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                  <div className="mb-4 inline-flex rounded-xl bg-primary/15 p-3 text-primary">
                    <item.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="font-serif text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </article>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section id="demo-flows" className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-8 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
              Three demo stories, built for decision makers.
            </h2>
          </MotionReveal>
          <MotionStagger className="grid gap-6 lg:grid-cols-3" stagger={0.08}>
            {demoFlows.map((flow) => (
              <MotionStaggerItem key={flow.title}>
                <article className="h-full rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 via-card/70 to-primary/[0.06] p-6 shadow-lg shadow-primary/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/85">{flow.label}</p>
                  <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight">{flow.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{flow.detail}</p>
                  <ul className="mt-5 space-y-2.5">
                    {flow.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/90">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>
    </main>
  )
}
