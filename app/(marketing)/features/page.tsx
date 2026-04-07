import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PricingModelMarketingSection } from '@/components/marketing/pricing-model-marketing-section'
import { Badge } from '@/components/ui/badge'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import {
  type LucideIcon,
  ArrowRight,
  Moon,
  Sun,
  Shield,
  TrendingUp,
  Users,
  Link2,
  Calendar,
  Sparkles,
  Zap,
  Brain,
  MessageCircle,
  Mic,
  Library,
  HeartPulse,
  MessagesSquare,
  Activity,
  LayoutGrid,
  Eye,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/features',
  title: 'Features | Circe et Venus',
  description:
    'Divine Manager (voice + chat), Circe retention & protection, Venus growth, AI Studio, cosmic content calendar, unified OnlyFans & Fansly messages, fan CRM, and analytics — aligned with what ships in the app.',
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

type FeatureCard = {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
}

export default function FeaturesPage() {
  const divineManagerFeatures: FeatureCard[] = [
    {
      icon: Mic,
      title: 'Voice-native control',
      description:
        'Speak tasks and questions — Divine Manager routes them into actions across your connected accounts, library, and automations (within your rules).',
      badge: 'Signature',
    },
    {
      icon: MessageCircle,
      title: 'Chat + tools',
      description:
        'One thread for fan context, AI Studio tools, thread scans, and platform-aware drafts — built for messy, human instructions.',
      badge: null,
    },
    {
      icon: Zap,
      title: 'Executable intents',
      description:
        'Not just answers: triggers that can call APIs, queue chatter drafts, and run guarded automations you confirm.',
      badge: 'Pro',
    },
  ]

  const circeFeatures: FeatureCard[] = [
    {
      icon: Shield,
      title: "Circe's Aegis",
      description:
        'Protection hub: shield toggles, scheduled leak scans (Serper-backed pipeline), severity review, and optional DMCA draft workflows — you stay in control.',
      badge: 'Pro',
    },
    {
      icon: Eye,
      title: 'Leak alerts & DMCA',
      description:
        'Surface candidates from scans, track claims and resolutions, and draft notices — nothing is filed to hosts without your review.',
      badge: null,
    },
    {
      icon: Activity,
      title: 'Retention & churn',
      description:
        'Retention workspace with batch digests, churn-risk signals, and teases tied to your calendar — merged with Churn Predictor in AI Studio.',
      badge: null,
    },
    {
      icon: Brain,
      title: 'Analytics & income',
      description:
        'Dashboards, snapshots, and Income Predictor — partner-style forecasts with your synced data and goal realism.',
      badge: null,
    },
  ]

  const venusFeatures: FeatureCard[] = [
    {
      icon: Users,
      title: 'Fan CRM',
      description:
        'Segments, spend, tags, and thread context — the same ledger Housekeeping and Chatter use for smart lists.',
      badge: null,
    },
    {
      icon: TrendingUp,
      title: 'Mentions',
      description:
        'Track how you show up off-platform — separate from leak alerts, tuned for reputation and outreach.',
      badge: null,
    },
    {
      icon: MessagesSquare,
      title: 'Commenter & Housekeeping',
      description:
        'Ingest comments, score tone, draft public replies (review-only), and sync smart lists to platform tags.',
      badge: 'MVP',
    },
    {
      icon: Target,
      title: "Cupid's Arrow & attraction",
      description:
        'Premium Venus tools in AI Studio for newest fans and commercial “attraction” scoring — paired with CRM.',
      badge: 'Pro',
    },
  ]

  const workspaceFeatures: FeatureCard[] = [
    {
      icon: MessageCircle,
      title: 'Sacred inbox',
      description: 'Direct messages across OnlyFans and Fansly in one place — with Divine focus, thread scans, and mass reach.',
      badge: null,
    },
    {
      icon: Calendar,
      title: 'Cosmic content calendar',
      description:
        'Schedule and orchestrate drops; fantasy writer and teasers can tie to calendar events when you want that layer.',
      badge: null,
    },
    {
      icon: Library,
      title: 'Content library',
      description: 'Vault, search, reuse, and ship — wired into AI Studio and DM bundle pricing helpers.',
      badge: null,
    },
    {
      icon: HeartPulse,
      title: 'Well-being & social',
      description: 'Creator rhythm and social surfaces in-app — alongside Community and Guide.',
      badge: null,
    },
  ]

  const aiStudioHighlights: { title: string; items: string[] }[] = [
    {
      title: 'Content & media',
      items: [
        'Content Ideas — trending angles plus captions (media upload or text)',
        'Fantasy Writer — scenario drafts tied to calendar and fans',
        'Safe photo touch-up — blur, brightness, emoji (no beautify/inpaint)',
      ],
    },
    {
      title: 'Engagement',
      items: [
        'AI Chatter — per-fan automation and review queue (OnlyFans)',
        'Commenter & Housekeeping — same engine as Dashboard routes',
        'Gift Suggester & Whale Whisperer',
      ],
    },
    {
      title: 'Analytics & protection',
      items: [
        'Churn Predictor, Retention tease, Income Predictor',
        'Leak Scanner & DMCA Automator — pair with Protection',
        "Circe's Aegis — unified protection runner from the library",
      ],
    },
    {
      title: 'Premium',
      items: [
        'Competitor Analysis — cohort bands vs one tier up',
        "Cupid's Arrow & Standard of Attraction",
        'Voice cloning — on the roadmap, not runnable yet',
      ],
    },
  ]

  const integrations = [
    { name: 'OnlyFans', detail: 'Messages, fans sync, comment webhooks, chatter' },
    { name: 'Fansly', detail: 'Messages, CRM tags, conversations' },
    { name: 'ManyVids', detail: 'Included on Unified billing — tools focus on OF/Fansly surfaces today' },
  ]

  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
          <div className="absolute left-1/4 top-1/3 h-80 w-80 rounded-full bg-circe/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <MotionReveal>
            <Badge className="mb-4 gap-1.5 border-primary/40 bg-gradient-to-r from-primary/10 to-circe/10 px-4 py-2 text-primary">
              <Mic className="h-3.5 w-3.5" />
              Voice-first · Built for adult platforms
            </Badge>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              What&apos;s in the product{' '}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                today
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
              We trimmed aspirational copy: this page tracks the sidebar, AI Studio library, and live routes — OnlyFans &
              Fansly in the inbox, protection and retention under Circe, growth and fans under Venus.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Badge variant="outline" className="gap-1.5 border-circe/50 px-4 py-2">
                <Moon className="h-3.5 w-3.5 text-circe-light" />
                <span className="text-circe-light">Circe</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-amber-500/50 px-4 py-2">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">Venus</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-primary/50 px-4 py-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary">AI Studio</span>
              </Badge>
            </div>
          </MotionReveal>
          <MotionStagger className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3" stagger={0.08}>
            <MotionStaggerItem>
              <div className="rounded-2xl border border-primary/25 bg-card/60 px-4 py-5 text-center backdrop-blur-md marketing-glow-ring">
                <p className="font-serif text-2xl font-semibold text-primary">14 days</p>
                <p className="text-xs text-muted-foreground">Trial before you subscribe</p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="rounded-2xl border border-circe/25 bg-card/60 px-4 py-5 text-center backdrop-blur-md">
                <p className="font-serif text-2xl font-semibold text-circe-light">Voice + UI</p>
                <p className="text-xs text-muted-foreground">Divine Manager</p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-5 text-center backdrop-blur-md">
                <p className="font-serif text-2xl font-semibold text-foreground">OF + FL</p>
                <p className="text-xs text-muted-foreground">Unified inbox focus</p>
              </div>
            </MotionStaggerItem>
          </MotionStagger>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Divine Manager</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              The surface where voice and chat meet your stack — same tools as Dashboard → Divine Manager.
            </p>
          </MotionReveal>
          <MotionReveal>
            <FeatureGrid title="Why it matters" features={divineManagerFeatures} color="primary" />
          </MotionReveal>
          <MotionReveal>
            <DivineCommandCenter />
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
          <MotionReveal>
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
              <FeatureGrid
                title="Circe — Retention & protection"
                description="Matches sidebar: Analytics, Retention, Protection."
                features={circeFeatures}
                color="circe"
              />
              <FeatureGrid
                title="Venus — Growth & fans"
                description="Matches sidebar: Fans, Commenter (housekeeping), Mentions."
                features={venusFeatures}
                color="venus"
              />
            </div>
          </MotionReveal>

          <MotionReveal>
            <FeatureGrid
              title="Workspace"
              description="Dashboard, Messages, Content calendar, Library, Well-being, Social — silver navigation in-app."
              features={workspaceFeatures}
              color="primary"
            />
          </MotionReveal>

          <MotionReveal>
            <div className="rounded-3xl border border-border/40 bg-card/30 p-6 shadow-lg sm:p-8">
              <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold tracking-tight text-primary sm:text-3xl">AI Studio</h2>
                  <p className="mt-2 max-w-prose text-muted-foreground">
                    Library tools with credit costs; some tools are Divine Manager–only or Protection-adjacent. Open{' '}
                    <span className="text-foreground/90">Dashboard → AI Studio</span> after you sign in for the live
                    grid and runners.
                  </p>
                </div>
                <LayoutGrid className="hidden h-8 w-8 text-muted-foreground/40 sm:block" aria-hidden />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {aiStudioHighlights.map((block) => (
                  <div
                    key={block.title}
                    className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6"
                  >
                    <h3 className="font-semibold text-foreground">{block.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {block.items.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </MotionReveal>

          <MotionReveal>
            <div className="rounded-3xl border border-border/40 bg-card/30 p-6 shadow-lg sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Integrations</h2>
                  <p className="mt-2 max-w-prose text-muted-foreground">
                    We don&apos;t claim every social network as a full DM bridge — here&apos;s what the product is built
                    around today.
                  </p>
                </div>
                <Link2 className="h-8 w-8 shrink-0 text-muted-foreground/40" aria-hidden />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {integrations.map((i) => (
                  <div
                    key={i.name}
                    className="rounded-2xl border border-border/60 bg-background/50 p-4 sm:p-5"
                  >
                    <p className="font-semibold text-foreground">{i.name}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{i.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      <PricingModelMarketingSection layout="bento" />

      <section className="border-t border-border/40 bg-card/25 px-4 py-16 backdrop-blur-sm sm:px-6 sm:py-24">
        <MotionReveal className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-circe/[0.08] via-card to-primary/[0.06] p-10 text-center sm:p-14">
          <div className="marketing-rainbow-edge mx-auto mb-6 h-1 max-w-xs rounded-full" />
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">See it in the app</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start the trial, connect a platform, and open Divine Manager — the feature set above is the same structure
            you&apos;ll navigate in the dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="h-12 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-primary-foreground shadow-lg"
              >
                Start free trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 rounded-full border-primary/35 px-10">
                View pricing
              </Button>
            </Link>
          </div>
        </MotionReveal>
      </section>
    </main>
  )
}

function FeatureGrid({
  title,
  description,
  features,
  color,
  className,
}: {
  title: string
  description?: string
  features: FeatureCard[]
  color: 'circe' | 'venus' | 'primary'
  className?: string
}) {
  const titleClass =
    color === 'circe' ? 'text-circe-light' : color === 'venus' ? 'text-amber-400' : 'text-primary'
  const cardBorder =
    color === 'circe'
      ? 'border-circe/25 bg-circe/[0.04] hover:border-circe/45 hover:shadow-md hover:shadow-circe/5'
      : color === 'venus'
        ? 'border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-500/45 hover:shadow-md hover:shadow-amber-500/10'
        : 'border-primary/25 bg-primary/[0.04] hover:border-primary/45 hover:shadow-md hover:shadow-primary/10'
  const iconWrap =
    color === 'circe'
      ? 'bg-circe/20 text-circe-light'
      : color === 'venus'
        ? 'bg-amber-500/20 text-amber-400'
        : 'bg-primary/20 text-primary'
  const badgeClass =
    color === 'circe'
      ? 'border-circe/50 text-circe-light'
      : color === 'venus'
        ? 'border-amber-500/50 text-amber-400'
        : 'border-primary/50 text-primary'

  return (
    <div className={cn('rounded-3xl border border-border/40 bg-card/30 p-6 shadow-lg sm:p-8', className)}>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={cn('font-serif text-2xl font-semibold tracking-tight sm:text-3xl', titleClass)}>{title}</h2>
          {description ? <p className="mt-2 max-w-prose text-muted-foreground">{description}</p> : null}
        </div>
        <LayoutGrid className="hidden h-8 w-8 text-muted-foreground/40 sm:block" aria-hidden />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className={cn(
              'group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 sm:p-6',
              cardBorder,
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className={cn('inline-flex rounded-xl p-3 ring-1 ring-black/5 dark:ring-white/10', iconWrap)}>
                <feature.icon className="h-6 w-6" />
              </div>
              {feature.badge ? (
                <Badge variant="outline" className={cn('text-xs', badgeClass)}>
                  {feature.badge}
                </Badge>
              ) : null}
            </div>
            <h3 className="mb-2 font-semibold tracking-tight">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
