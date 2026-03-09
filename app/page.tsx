'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Users, Calendar, DollarSign } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero-style background: gold, purple, yellow gradients (no shader lib) */}
      <div className="fixed inset-0 -z-10 animate-hero-gradient">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-purple-50 to-yellow-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,191,36,0.35),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_50%,rgba(147,51,234,0.25),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_20%_80%,rgba(234,179,8,0.2),transparent_50%)]" />
      </div>

      {/* Header — Hero-section style: logo, nav, login + get started with arrow */}
      <header className="sticky top-0 z-50 border-b border-amber-200/50 bg-white/70 backdrop-blur-md dark:border-purple-900/30 dark:bg-gray-900/70">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Circe and Venus" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" priority />
            <span className="font-title text-lg font-bold bg-gradient-to-r from-amber-600 via-purple-600 to-amber-500 bg-clip-text text-transparent">
              Circe and Venus
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-amber-400">
              Features
            </Link>
            <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-amber-400">
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-gray-700 hover:text-purple-600 dark:text-gray-200 dark:hover:text-amber-400">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild className="gap-2 bg-gradient-to-r from-amber-500 via-purple-600 to-amber-500 bg-[length:200%_100%] text-white hover:opacity-95 hover:shadow-lg hover:shadow-purple-500/25">
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
              <div className="h-[320px] w-[320px] rounded-full border-2 border-amber-400/30 bg-gradient-to-br from-amber-100/40 to-purple-100/40 blur-xl animate-pulse-ring dark:border-purple-500/20 dark:from-purple-950/30 dark:to-amber-950/20 md:h-[400px] md:w-[400px]" />
            </div>

            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-4 py-1.5 text-sm font-medium text-amber-800 dark:border-purple-500/30 dark:bg-purple-950/40 dark:text-amber-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                OnlyFans • MYM • Fansly
              </div>

              <h1 className="font-title text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="bg-gradient-to-r from-amber-500 via-purple-600 to-yellow-500 bg-clip-text text-transparent">
                  Manage Your Creator
                </span>
                <br />
                <span className="text-gray-800 dark:text-gray-100">Empire</span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300 md:text-xl">
                One platform for fans, content, messages, and revenue. Beautiful tools in gold and purple.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 gap-2 px-8 text-lg bg-gradient-to-r from-amber-500 via-purple-600 to-amber-500 bg-[length:200%_100%] text-white shadow-lg shadow-purple-500/20 hover:opacity-95"
                >
                  <Link href="/auth/sign-up">
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-2 border-purple-300 px-8 text-lg hover:bg-purple-50 hover:border-purple-400 dark:border-purple-600 dark:hover:bg-purple-950/50">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features — gold / purple / yellow card styling */}
        <section id="features" className="border-t border-amber-200/50 bg-white/50 py-20 dark:border-purple-900/30 dark:bg-gray-900/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-title text-center text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                Everything you need in <span className="bg-gradient-to-r from-amber-500 to-purple-600 bg-clip-text text-transparent">gold & purple</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600 dark:text-gray-400">
                Built for creators and agencies.
              </p>
              <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition hover:shadow-xl hover:shadow-amber-500/10 dark:border-purple-800/40 dark:bg-gray-900/60">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fan Management</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">CRM for your subscribers. Segment, tag, and never miss a high-value fan.</p>
                </div>
                <div className="rounded-2xl border border-purple-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-800/40 dark:bg-gray-900/60">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Calendar</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Schedule and publish across OnlyFans, MYM, and Fansly from one place.</p>
                </div>
                <div className="rounded-2xl border border-yellow-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition hover:shadow-xl hover:shadow-yellow-500/10 dark:border-amber-800/40 dark:bg-gray-900/60">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue & Analytics</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Track earnings and engagement with privacy controls and insights.</p>
                </div>
                <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-800/40 dark:bg-gray-900/60">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-purple-600 to-amber-500 text-white shadow-md">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leak Protection</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Monitor and take down leaked content to protect your brand.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
