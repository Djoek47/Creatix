import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PricingModelMarketingSection } from '@/components/marketing/pricing-model-marketing-section'
import { Badge } from '@/components/ui/badge'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import {
  ArrowRight,
  Moon,
  Sun,
  Star,
  Shield,
  TrendingUp,
  Users,
  Link2,
  Calendar,
  BarChart3,
  Sparkles,
  Zap,
  Eye,
  Bell,
  Brain,
  Lock,
  Palette,
  Clock,
  Target,
  Heart,
  Crown,
  Wand2,
  Camera,
  Gift,
  Globe,
  Search,
  FileText,
  PieChart,
  AlertTriangle,
  UserPlus,
  MessageCircle,
  Megaphone,
  LayoutGrid,
  Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'

export const metadata: Metadata = buildPublicMetadata({
  path: '/features',
  title: 'Features | Circe et Venus',
  description:
    'Divine Manager (voice + chat), Circe retention & leak protection, Venus growth, AI Studio tools, cosmic calendar, CRM, DMs, and creator analytics — OnlyFans, Fansly & more in one platform.',
  keywords: [
    'creator features',
    'OnlyFans AI',
    'Fansly tools',
    'DMCA protection',
    'creator CRM',
    'voice AI assistant',
    'content calendar',
    'Circe et Venus',
  ],
})

export default function FeaturesPage() {
  const divineManagerFeatures = [
    {
      icon: Mic,
      title: 'Voice-native control',
      description:
        'Hands full, on stream, or just done typing? Speak tasks, questions, and wild ideas — Divine Manager routes them into real actions.',
      badge: 'Signature',
    },
    {
      icon: MessageCircle,
      title: 'Conversational operations',
      description:
        'Mass DMs, fan replies, pricing nudges, and “what should I do tonight?” — all in one thread that understands creator context.',
      badge: null,
    },
    {
      icon: Zap,
      title: 'Executable intents',
      description:
        'Not just text answers: triggers that touch your connected platforms, library, and automations (within your rules and confirmations).',
      badge: 'Pro',
    },
  ]

  const circeFeatures = [
    {
      icon: Shield,
      title: 'Aegis Protection',
      description: 'Divine shield against content leaks with automated DMCA takedowns and continuous monitoring across the web.',
      badge: 'Pro',
    },
    {
      icon: Eye,
      title: 'Leak Detection Scanner',
      description: 'Advanced AI scans thousands of sites daily to find unauthorized copies of your content.',
      badge: null,
    },
    {
      icon: AlertTriangle,
      title: 'Churn Risk Alerts',
      description: 'Predict which fans are about to leave and get actionable strategies to retain them.',
      badge: null,
    },
    {
      icon: Brain,
      title: 'Retention Analytics',
      description: 'Deep insights into what keeps your fans engaged and paying month after month.',
      badge: null,
    },
    {
      icon: Lock,
      title: 'Content Watermarking',
      description: 'Invisible watermarks on your content to track leaks back to the source.',
      badge: 'Pro',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Intelligent alerts for fan milestones, renewals, and engagement opportunities.',
      badge: null,
    },
  ]

  const venusFeatures = [
    {
      icon: TrendingUp,
      title: 'Growth Analytics',
      description: 'Track your audience growth across all platforms with predictive modeling.',
      badge: null,
    },
    {
      icon: UserPlus,
      title: 'Fan Acquisition',
      description: 'AI-powered strategies to attract new subscribers to your creator platforms.',
      badge: null,
    },
    {
      icon: Search,
      title: 'Reputation Monitor',
      description: 'Track mentions and sentiment across social media and review sites.',
      badge: 'Pro',
    },
    {
      icon: Target,
      title: 'Audience Insights',
      description: 'Understand your ideal fan demographics and optimize your content strategy.',
      badge: null,
    },
    {
      icon: Megaphone,
      title: 'Promotion Optimizer',
      description: 'Find the best times and platforms to promote your content for maximum reach.',
      badge: null,
    },
    {
      icon: Globe,
      title: 'Cross-Platform Sync',
      description: 'Manage your presence across OnlyFans, Fansly, and other platforms from one dashboard.',
      badge: null,
    },
  ]

  const aiToolsFeatures = [
    {
      icon: MessageCircle,
      title: 'AI Chatter',
      description: 'Automated fan responses that sound authentically like you, available 24/7.',
      badge: null,
    },
    {
      icon: Wand2,
      title: 'Caption Generator',
      description: 'Create engaging captions for your posts with AI that matches your voice.',
      badge: null,
    },
    {
      icon: FileText,
      title: 'Bio Optimizer',
      description: 'Craft the perfect bio that attracts and converts potential fans.',
      badge: null,
    },
    {
      icon: Palette,
      title: 'Content Ideas',
      description: 'Never run out of ideas with AI-generated content suggestions based on trends.',
      badge: null,
    },
    {
      icon: Heart,
      title: 'PPV Pricing',
      description: 'AI-optimized pricing for your pay-per-view content to maximize revenue.',
      badge: 'Pro',
    },
    {
      icon: Gift,
      title: 'Tip Menu Creator',
      description: 'Design appealing tip menus that encourage fan spending.',
      badge: null,
    },
  ]

  const cosmicFeatures = [
    {
      icon: Calendar,
      title: 'Cosmic Content Calendar',
      description: 'Schedule posts aligned with zodiac cycles and planetary alignments for optimal engagement.',
      badge: null,
    },
    {
      icon: Star,
      title: 'Personal Astro Profile',
      description: 'Unlock personalized insights based on your birth chart for strategic decisions.',
      badge: null,
    },
    {
      icon: Moon,
      title: 'Moon Phase Timing',
      description: 'Post during optimal moon phases for different content types.',
      badge: null,
    },
    {
      icon: Sun,
      title: 'Zodiac Audience Analysis',
      description: 'Understand your fan base by their astrological signs for targeted content.',
      badge: 'Pro',
    },
  ]

  const analyticsFeatures = [
    {
      icon: BarChart3,
      title: 'Revenue Dashboard',
      description: 'Track earnings across all platforms with detailed breakdowns and trends.',
      badge: null,
    },
    {
      icon: PieChart,
      title: 'Fan Segmentation',
      description: 'Categorize fans by spending, engagement, and lifetime value.',
      badge: null,
    },
    {
      icon: Clock,
      title: 'Best Time to Post',
      description: 'AI-analyzed optimal posting times based on your audience activity.',
      badge: null,
    },
    {
      icon: Crown,
      title: 'Whale Identification',
      description: 'Identify and nurture your highest-value fans with special attention.',
      badge: null,
    },
  ]

  const managementFeatures = [
    {
      icon: Users,
      title: 'Fan CRM',
      description: 'Comprehensive fan relationship management with notes, tags, and history.',
      badge: null,
    },
    {
      icon: Link2,
      title: 'Platform Integrations',
      description: 'Connect OnlyFans, Fansly, MYM, Instagram, TikTok, Twitter, and more.',
      badge: null,
    },
    {
      icon: Camera,
      title: 'Content Library',
      description: 'Organize and manage all your content in one secure location.',
      badge: 'Pro',
    },
    {
      icon: Zap,
      title: 'Automation Rules',
      description: 'Set up automated workflows for common tasks and responses.',
      badge: 'Pro',
    },
  ]

  type FeatureItem =
    | (typeof circeFeatures)[number]
    | (typeof divineManagerFeatures)[number]

  const FeatureSection = ({
    title,
    description,
    features,
    color,
    className,
  }: {
    title: string
    description: string
    features: FeatureItem[]
    color: 'circe' | 'venus' | 'primary'
    className?: string
  }) => {
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
            <h2 className={cn('font-serif text-2xl font-semibold tracking-tight sm:text-3xl', titleClass)}>
              {title}
            </h2>
            <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>
          </div>
          <LayoutGrid className="hidden h-8 w-8 text-muted-foreground/40 sm:block" aria-hidden />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                {feature.badge && (
                  <Badge variant="outline" className={cn('text-xs', badgeClass)}>
                    {feature.badge}
                  </Badge>
                )}
              </div>
              <h3 className="mb-2 font-semibold tracking-tight">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

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
              Voice-first · 30+ capabilities
            </Badge>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Everything you need.{' '}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                Nothing generic.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
              Run retention, growth, AI, and operations from one divine cockpit.{' '}
              <span className="text-foreground/90">Talk your empire into motion</span> with the Divine Manager — or
              drive it classically. Your workflow, your ritual.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Badge variant="outline" className="gap-1.5 border-circe/50 px-4 py-2">
                <Moon className="h-3.5 w-3.5 text-circe-light" />
                <span className="text-circe-light">Circe · Retention</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-amber-500/50 px-4 py-2">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">Venus · Growth</span>
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
                <p className="text-xs text-muted-foreground">Divine Manager control</p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-5 text-center backdrop-blur-md">
                <p className="font-serif text-2xl font-semibold text-foreground">11 bands</p>
                <p className="text-xs text-muted-foreground">Revenue-based pricing</p>
              </div>
            </MotionStaggerItem>
          </MotionStagger>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">The Divine Manager</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              The only surface where speaking is as powerful as clicking. Built for messy, human instructions — not
              stiff commands.
            </p>
          </MotionReveal>
          <MotionReveal>
            <FeatureSection
              title="Why voice changes everything"
              description="When you're in flow, on camera, or protecting your wrists — you still deserve full control."
              features={divineManagerFeatures}
              color="primary"
            />
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
              <FeatureSection
                title="Circe — Retention & protection"
                description="Keep fans enchanted and your content sovereign."
                features={circeFeatures}
                color="circe"
              />
              <FeatureSection
                title="Venus — Growth & attraction"
                description="Turn attention into audience — and audience into revenue."
                features={venusFeatures}
                color="venus"
              />
            </div>
          </MotionReveal>

          <MotionReveal>
            <FeatureSection
              title="AI Studio"
              description="Draft, reply, price, and ideate with models that understand adult creator context."
              features={aiToolsFeatures}
              color="circe"
            />
          </MotionReveal>

          <MotionReveal>
            <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
              <div className="lg:col-span-2">
                <FeatureSection
                  title="Cosmic calendar"
                  description="Optional celestial timing for drops that feel intentional."
                  features={cosmicFeatures}
                  color="primary"
                />
              </div>
              <div className="lg:col-span-3">
                <FeatureSection
                  title="Analytics & insights"
                  description="Dashboards you can interrogate — including with your voice."
                  features={analyticsFeatures}
                  color="primary"
                />
              </div>
            </div>
          </MotionReveal>

          <MotionReveal>
            <FeatureSection
              title="Platform management"
              description="Connections, library, automations — one nervous system."
              features={managementFeatures}
              color="primary"
            />
          </MotionReveal>
        </div>
      </section>

      <PricingModelMarketingSection layout="bento" />

      <section className="border-t border-border/40 bg-card/25 px-4 py-16 backdrop-blur-sm sm:px-6 sm:py-24">
        <MotionReveal className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-circe/[0.08] via-card to-primary/[0.06] p-10 text-center sm:p-14">
          <div className="marketing-rainbow-edge mx-auto mb-6 h-1 max-w-xs rounded-full" />
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Taste the full stack</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Trial everything. Fall in love with the voice layer. Then lock a tier that matches your revenue band.
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
