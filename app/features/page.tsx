import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { PricingModelMarketingSection } from '@/components/marketing/pricing-model-marketing-section'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Features | Circe et Venus',
  description: 'Explore all the divine features that Circe et Venus offers to content creators',
}

export default function FeaturesPage() {
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

  type FeatureItem = (typeof circeFeatures)[number]

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
      <div className={cn('rounded-3xl border border-border/40 bg-card/30 p-6 shadow-sm sm:p-8', className)}>
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
                'group rounded-2xl border p-5 transition-all duration-200 sm:p-6',
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
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                Pricing
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
            <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-circe/5 blur-3xl" />
            <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
          </div>
          
          <div className="mx-auto max-w-5xl text-center">
            <Badge className="mb-4 gap-1">
              <Sparkles className="h-3 w-3" />
              30+ Divine Features
            </Badge>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Every tool a <span className="text-primary">creator</span> needs
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Retention, growth, and AI workflows in one place — priced by revenue band with Focus (1–2 platforms)
              or Unified when you run the full stack.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Badge variant="outline" className="gap-1.5 border-circe/50 px-4 py-1.5">
                <Moon className="h-3.5 w-3.5 text-circe-light" />
                <span className="text-circe-light">Circe · Retention</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-amber-500/50 px-4 py-1.5">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">Venus · Growth</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-primary/50 px-4 py-1.5">
                <Star className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary">AI Studio</span>
              </Badge>
            </div>
            <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-4 text-center backdrop-blur-sm">
                <p className="font-serif text-2xl font-semibold text-primary">14 days</p>
                <p className="text-xs text-muted-foreground">Full trial before you subscribe</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-4 text-center backdrop-blur-sm">
                <p className="font-serif text-2xl font-semibold text-foreground">11 bands</p>
                <p className="text-xs text-muted-foreground">Revenue-based monthly pricing</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-4 text-center backdrop-blur-sm sm:col-span-1">
                <p className="font-serif text-2xl font-semibold text-foreground">Focus / Unified</p>
                <p className="text-xs text-muted-foreground">1–2 platforms or all three</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
              <FeatureSection
                title="Circe — Retention & protection"
                description="Keep fans engaged and your content safe with monitoring, alerts, and leak response."
                features={circeFeatures}
                color="circe"
              />
              <FeatureSection
                title="Venus — Growth & attraction"
                description="Grow reach and reputation across social and creator platforms from one command center."
                features={venusFeatures}
                color="venus"
              />
            </div>

            <FeatureSection
              title="AI Studio"
              description="Draft, reply, and optimize with models tuned for creator workflows."
              features={aiToolsFeatures}
              color="circe"
            />

            <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
              <div className="lg:col-span-2">
                <FeatureSection
                  title="Cosmic calendar"
                  description="Optional celestial timing layers for campaigns and drops."
                  features={cosmicFeatures}
                  color="primary"
                />
              </div>
              <div className="lg:col-span-3">
                <FeatureSection
                  title="Analytics & insights"
                  description="Revenue, fans, and engagement in dashboards you can act on."
                  features={analyticsFeatures}
                  color="primary"
                />
              </div>
            </div>

            <FeatureSection
              title="Platform management"
              description="Connections, content library, and automation across the networks you use."
              features={managementFeatures}
              color="primary"
            />
          </div>
        </section>

        <PricingModelMarketingSection layout="bento" />

        {/* CTA */}
        <section className="border-t border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-amber-500/5 p-8 text-center sm:p-12">
            <div className="mb-6 flex justify-center gap-4">
              <div className="rounded-full bg-circe/20 p-3">
                <Moon className="h-8 w-8 text-circe-light" />
              </div>
              <div className="rounded-full bg-amber-500/20 p-3">
                <Sun className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to Experience Divine Features?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Try everything during your trial, then subscribe at the tier that matches your revenue and platform
              setup.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="px-8">
                  View Pricing
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
              <Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link>
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
