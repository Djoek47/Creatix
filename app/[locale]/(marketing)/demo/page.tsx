import Link from 'next/link'
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
    label: 'Story 01',
    title: 'Inbox to upsell in 90 seconds',
    detail:
      'Segment high-intent fans, draft personalized replies, and queue premium follow-ups without leaving the thread.',
    bullets: [
      'Intent surfaces beside the conversation',
      'Offers respect fan context and tier',
      'Follow-ups land on your schedule',
    ],
  },
  {
    label: 'Story 02',
    title: 'Protection, end to end',
    detail:
      'From leak alert to evidence you can stand behind: packaging, exports, and takedown drafts in one deliberate path.',
    bullets: [
      'Source and spread, visible at a glance',
      'DMCA packet ready after one review pass',
      'Status from report through removal',
    ],
  },
  {
    label: 'Story 03',
    title: 'A weekly command view',
    detail:
      'Account health, churn risk, and the next best move—presented as a single calm read, not a wall of widgets.',
    bullets: [
      'Revenue, retention, and velocity in one frame',
      'At-risk segments called out plainly',
      'Runbooks you can trigger in a click',
    ],
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

      <section className="px-4 pb-16 sm:px-6 sm:pb-20" aria-labelledby="demo-capabilities-heading">
        <div className="mx-auto max-w-6xl border-t border-border/30 pt-14 sm:pt-20">
          <MotionReveal>
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Surface area
            </p>
            <h2
              id="demo-capabilities-heading"
              className="mx-auto mt-3 max-w-2xl text-center font-serif text-3xl font-medium tracking-tight text-foreground sm:text-[2rem] sm:leading-tight"
            >
              One workspace. Six responsibilities.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-muted-foreground">
              No decoration for its own sake—only what you actually operate.
            </p>
          </MotionReveal>
          <MotionStagger className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14" stagger={0.05}>
            {capabilities.map((item) => (
              <MotionStaggerItem key={item.title}>
                <article className="flex gap-4">
                  <item.icon
                    className="mt-0.5 h-5 w-5 shrink-0 text-foreground/40"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-medium leading-snug tracking-tight text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </article>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section id="demo-flows" className="px-4 pb-20 sm:px-6 sm:pb-24" aria-labelledby="demo-flows-heading">
        <div className="mx-auto max-w-6xl border-t border-border/30 pt-14 sm:pt-20">
          <MotionReveal>
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Narratives
            </p>
            <h2
              id="demo-flows-heading"
              className="mx-auto mt-3 max-w-3xl text-center font-serif text-3xl font-medium tracking-tight text-foreground sm:text-[2.125rem] sm:leading-tight"
            >
              Three stories for decision-makers.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-muted-foreground">
              Walkthroughs with weight—growth, protection, and command—not mockups.
            </p>
          </MotionReveal>
          <MotionStagger className="mt-16 grid gap-12 lg:mt-20 lg:grid-cols-3 lg:gap-0" stagger={0.06}>
            {demoFlows.map((flow, index) => (
              <MotionStaggerItem key={flow.title}>
                <article
                  className={
                    index > 0 ? 'lg:border-l lg:border-border/25 lg:pl-10' : ''
                  }
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{flow.label}</p>
                  <h3 className="mt-5 font-serif text-2xl font-medium leading-[1.2] tracking-tight text-foreground sm:text-[1.65rem]">
                    {flow.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{flow.detail}</p>
                  <ul className="mt-8 space-y-3 border-t border-border/20 pt-8">
                    {flow.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="border-l-2 border-foreground/10 pl-4 text-sm leading-relaxed text-foreground/85"
                      >
                        {bullet}
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
