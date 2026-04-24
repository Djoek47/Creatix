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
  { icon: MessageSquare, title: 'Unified inbox', desc: 'OnlyFans and Fansly DMs in one place.' },
  { icon: Mic, title: 'Divine Manager', desc: 'Voice or chat. It runs the app for you.' },
  { icon: Users, title: 'Fan CRM', desc: 'Segments, spend, and context.' },
  { icon: Shield, title: 'Protection', desc: 'Leak alerts and DMCA drafts you approve.' },
  { icon: Eye, title: 'Mentions', desc: 'Reputation off-platform.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Revenue and activity from synced data.' },
  { icon: Sparkles, title: 'AI Studio', desc: 'Captions, chatter, pricing, and more.' },
  { icon: Calendar, title: 'Content calendar', desc: 'Plan drops and keep rhythm.' },
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
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <MotionStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.05}>
            {features.map((f) => (
              <MotionStaggerItem key={f.title}>
                <div className="h-full rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg">
                  <div className="mb-4 inline-flex rounded-xl bg-primary/15 p-3 text-primary">
                    <f.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h2 className="font-serif text-lg font-semibold">{f.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>
    </main>
  )
}
