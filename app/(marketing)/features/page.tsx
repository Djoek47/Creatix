import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import {
  Shield,
  Users,
  MessageSquare,
  Mic,
  BarChart3,
  Sparkles,
  Eye,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/features',
  title: 'Features | Circe et Venus',
  description:
    'Messages, fans, AI Studio, protection, and analytics for OnlyFans and Fansly — in one workspace.',
  keywords: [
    'creator features',
    'OnlyFans tools',
    'Fansly DMs',
    'DMCA leak protection',
    'creator CRM',
    'voice AI assistant',
    'AI Studio',
    'Circe et Venus',
  ],
})

const features = [
  {
    icon: MessageSquare,
    title: 'Unified inbox',
    desc: 'OnlyFans and Fansly DMs in one place with quick fan context.',
    accent: 'from-sky-500/30 via-cyan-400/15 to-transparent',
  },
  {
    icon: Mic,
    title: 'Divine Manager',
    desc: 'Voice or chat command center for daily ops and follow-through.',
    accent: 'from-violet-500/30 via-fuchsia-400/15 to-transparent',
  },
  {
    icon: Users,
    title: 'Fan CRM',
    desc: 'Segments, spend, tags, and status for cleaner prioritization.',
    accent: 'from-blue-500/25 via-indigo-400/15 to-transparent',
  },
  {
    icon: Shield,
    title: 'Protection',
    desc: 'Leak alerts, DMCA-ready drafts, and handling history.',
    accent: 'from-amber-400/30 via-orange-300/15 to-transparent',
  },
  {
    icon: Eye,
    title: 'Mentions',
    desc: 'Off-platform reputation watch and review queue.',
    accent: 'from-fuchsia-500/25 via-pink-400/15 to-transparent',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Revenue and activity snapshots from your synced platforms.',
    accent: 'from-emerald-500/25 via-teal-400/15 to-transparent',
  },
  {
    icon: Sparkles,
    title: 'AI Studio',
    desc: 'Captions, pricing ideas, chatter support, and creator tools.',
    accent: 'from-violet-500/25 via-amber-300/15 to-transparent',
  },
  {
    icon: Calendar,
    title: 'Content calendar',
    desc: 'Plan drops, cadence, and campaign timing in one flow.',
    accent: 'from-yellow-400/25 via-amber-300/15 to-transparent',
  },
]

const extendedFeatureBullets = [
  'Mass DM prep with per-fan caption and PPV suggestions',
  'Whale watch + churn surfaces for retention timing',
  'OnlyFans/Fansly sync controls with status indicators',
  'Profile and platform status snapshots in one menu',
  'Protection scans + mention workflows in the same orbit',
  'Billing-aware mode switches for Focus vs Bundled paths',
]

export default function FeaturesPage() {
  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <MotionReveal>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Everything,{' '}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                in one place.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Start with the essentials, then expand to see the deeper workflows powering messaging, retention,
              analytics, and protection.
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <MotionStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.05}>
            {features.map((f) => (
              <MotionStaggerItem key={f.title}>
                <article
                  className={cn(
                    'group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm',
                    'transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_45px_-28px_rgba(0,0,0,0.7)]',
                  )}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                      f.accent,
                    )}
                    aria-hidden
                  />
                  <div className="relative mb-4 inline-flex rounded-xl bg-amber-400/15 p-3 text-amber-300 ring-1 ring-amber-300/25 shadow-[0_0_16px_-8px_rgba(251,191,36,0.7)]">
                    <f.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h2 className="relative font-serif text-lg font-semibold">{f.title}</h2>
                  <p className="relative mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </article>
              </MotionStaggerItem>
            ))}
          </MotionStagger>

          <MotionReveal delay={0.08}>
            <details className="group mt-7 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm open:border-primary/35">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground marker:content-none">
                Explore all capabilities
                <span className="rounded-full border border-border/70 bg-muted/35 px-2 py-0.5 text-xs text-muted-foreground transition group-open:rotate-180">
                  ˅
                </span>
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                More tools are available in-app and appear contextually when your integrations are connected.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {extendedFeatureBullets.map((line) => (
                  <li key={line} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
                    {line}
                  </li>
                ))}
              </ul>
            </details>
          </MotionReveal>
        </div>
      </section>
    </main>
  )
}
