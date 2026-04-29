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
  ChevronDown,
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

/** In-product depth — no boxes; rhythm and dividers only. */
const shippedCapabilityLines = [
  'Mass messaging with per-fan captions, PPV hints, and send prep',
  'Whale watch and churn surfaces so retention timing stays visible',
  'OnlyFans and Fansly sync with clear connection status',
  'Profile and platform health in one header menu',
  'Protection scans and mention review in the same workflow',
  'Billing-aware paths — single platform vs bundled — without switching accounts',
]

/** Early access; appears as tools mature. */
const betaCapabilities: { title: string; description: string }[] = [
  {
    title: 'Ariadne',
    description:
      'Discrete markers on vault exports and leak detection when you need to trace a clip back to a copy or recipient.',
  },
  {
    title: 'Retention radar',
    description: 'Scheduled churn scans and batch digests that run while you are away — credits only when fans match.',
  },
  {
    title: 'Studio frontier',
    description: 'New models and specialist tools land in AI Studio first, then graduate to the default library.',
  },
  {
    title: 'Frame & Markit',
    description: 'Optional handoff to the frame editor when your stack includes Markit — same session, fewer tab hops.',
  },
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
            <details className="group mt-16 border-t border-border/40 pt-12 sm:mt-20 sm:pt-14">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 marker:content-none [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 space-y-1 text-left">
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                    All capabilities
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                    The surface stays calm. Underneath is the full workspace — most of it reveals itself once your
                    platforms are connected.
                  </p>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/50 text-muted-foreground transition duration-300 ease-out group-open:rotate-180"
                  aria-hidden
                >
                  <ChevronDown className="h-5 w-5" strokeWidth={1.5} />
                </span>
              </summary>

              <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-border/30">
                <div className="lg:pr-12">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    In the product
                  </p>
                  <ul className="mt-6 space-y-0">
                    {shippedCapabilityLines.map((line) => (
                      <li
                        key={line}
                        className="border-t border-border/25 py-4 text-[15px] leading-relaxed text-foreground/85 first:border-t-0 first:pt-0"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:pl-12">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Beta &amp; ahead
                  </p>
                  <ul className="mt-6 space-y-0">
                    {betaCapabilities.map(({ title, description }) => (
                      <li
                        key={title}
                        className="border-t border-border/25 py-5 first:border-t-0 first:pt-0"
                      >
                        <p className="text-[15px] font-medium leading-snug text-foreground">{title}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-8 text-xs leading-relaxed text-muted-foreground/90">
                    Beta areas can change behavior or eligibility as we tighten quality. Nothing here is a promise of
                    future pricing or availability.
                  </p>
                </div>
              </div>
            </details>
          </MotionReveal>
        </div>
      </section>
    </main>
  )
}
