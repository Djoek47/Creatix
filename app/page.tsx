'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { BrandTitle } from '@/components/dashboard/brand-title'
import { SiteFooter } from '@/components/marketing/site-footer'
import { ArrowRight, Shield, Users, Calendar, DollarSign, Link2, BarChart3, Sparkles } from 'lucide-react'

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
            <BrandLogo width={32} height={32} className="h-8 w-8" priority />
            <BrandTitle className="text-lg" variant="header" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign In
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

              <h1 className="font-title text-4xl font-normal tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="brand-gradient-text">Manage Your Creator</span>
                <br />
                <span className="text-foreground/90">Empire</span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
                One platform for fans, content, messages, and revenue. Connect your accounts, manage your community, and grow your business with tools built for creators.
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

        {/* How it works */}
        <section className="border-t border-border py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="font-title text-3xl font-normal tracking-tight text-foreground md:text-4xl">
                How it works
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Get started in minutes. Connect your platforms, sync your data, and take control.
              </p>
              <div className="mt-16 grid gap-10 sm:grid-cols-3">
                {[
                  { step: '1', icon: Link2, title: 'Connect', desc: 'Link your OnlyFans, MYM, and Fansly accounts securely. We sync your fans, content, and earnings in one place.' },
                  { step: '2', icon: BarChart3, title: 'Manage', desc: 'Use your dashboard to track revenue, segment fans, schedule content, and monitor messages across all platforms.' },
                  { step: '3', icon: Sparkles, title: 'Grow', desc: 'AI tools, leak protection, and analytics help you protect your brand and grow your creator business.' },
                ].map((item) => (
                  <div key={item.step} className="relative brand-card p-6 text-left">
                    <span className="absolute -top-3 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                      {item.step}
                    </span>
                    <div className="mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-title text-xl font-normal text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features — unified brand cards */}
        <section id="features" className="border-t border-border py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-title text-center text-3xl font-normal tracking-tight text-foreground md:text-4xl">
                Everything you need in <span className="brand-gradient-text">gold & purple</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
                Built for creators and agencies. One dashboard for your entire creator business.
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
                    <h3 className="font-title text-lg font-normal text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust / CTA strip */}
        <section className="border-t border-border py-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Trusted by creators worldwide
            </p>
            <h2 className="font-title mt-4 text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
              Ready to take control of your creator business?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
              Join Circe and Venus today. Connect your platforms, manage your fans, and grow with confidence.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="brand-button h-12 gap-2 px-8">
                <Link href="/auth/sign-up">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8">
                <Link href="/about">Learn more</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
