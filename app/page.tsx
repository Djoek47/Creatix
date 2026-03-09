'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Users, Calendar, DollarSign } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Brand background: gold, purple, yellow — same gradient as auth & dashboard */}
      <div className="fixed inset-0 -z-10 animate-hero-gradient brand-bg" />
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,var(--primary)_0.12,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_50%,var(--accent)_0.08,transparent_50%)]" />
      </div>

      {/* Header — unified brand */}
      <header className="brand-header sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Circe and Venus" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" priority />
            <span className="font-title text-lg font-bold brand-gradient-text">
              Circe and Venus
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild className="brand-button gap-2 shadow-lg">
              <Link href="/auth/sign-up">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero content — badge, headline, description, CTAs + optional pulsing ring */}
      <main className="relative">
        <section className="container mx-auto flex min-h-[85vh] flex-col items-center justify-center px-4 py-20 text-center">
          <div className="relative">
            {/* Decorative pulsing ring (CSS-only, Hero-section style) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-[320px] w-[320px] rounded-full border-2 border-primary/20 bg-primary/5 blur-xl animate-pulse-ring md:h-[400px] md:w-[400px]" />
            </div>

            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm font-medium text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                OnlyFans • MYM • Fansly
              </div>

              <h1 className="font-title text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="brand-gradient-text">Manage Your Creator</span>
                <br />
                <span className="text-foreground/90">Empire</span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
                One platform for fans, content, messages, and revenue. Beautiful tools in gold and purple.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Button asChild size="lg" className="brand-button h-12 gap-2 px-8 text-lg shadow-lg">
                  <Link href="/auth/sign-up">
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-2 px-8 text-lg">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features — unified brand cards */}
        <section id="features" className="border-t border-border py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-title text-center text-3xl font-bold text-foreground md:text-4xl">
                Everything you need in <span className="brand-gradient-text">gold & purple</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
                Built for creators and agencies.
              </p>
              <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Users, title: 'Fan Management', desc: 'CRM for your subscribers. Segment, tag, and never miss a high-value fan.', color: 'bg-primary/15 text-primary' },
                  { icon: Calendar, title: 'Content Calendar', desc: 'Schedule and publish across OnlyFans, MYM, and Fansly from one place.', color: 'bg-accent/15 text-accent-foreground' },
                  { icon: DollarSign, title: 'Revenue & Analytics', desc: 'Track earnings and engagement with privacy controls and insights.', color: 'bg-primary/15 text-primary' },
                  { icon: Shield, title: 'Leak Protection', desc: 'Monitor and take down leaked content to protect your brand.', color: 'bg-accent/15 text-accent-foreground' },
                ].map((item) => (
                  <div key={item.title} className="brand-card p-6 transition hover:shadow-lg">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
