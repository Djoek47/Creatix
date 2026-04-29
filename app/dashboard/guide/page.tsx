'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { BookOpen, Compass, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GuideOrbitJourney } from '@/components/guide/guide-orbit-journey'
import { GuideReferenceSections } from '@/components/guide/guide-reference-sections'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function GuidePage() {
  return (
    <div className="relative mx-auto max-w-5xl overflow-x-hidden pb-24">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[min(70vh,520px)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.55_0.2_295_/_0.18),transparent_65%),radial-gradient(ellipse_60%_40%_at_80%_20%,oklch(0.78_0.14_85_/_0.12),transparent_55%)]" />

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-12 space-y-6"
        data-tour="/dashboard/guide"
      >
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card/95 via-background to-violet-950/20 p-6 shadow-[0_0_60px_-20px_oklch(0.55_0.2_295_/_0.35)] sm:p-10">
          <motion.div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/25 via-primary/15 to-transparent blur-3xl"
            animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <Star className="h-3.5 w-3.5" aria-hidden />
                Onboarding compass
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                Guide &amp; orbital tour
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Scroll the <strong className="text-foreground">same journey as the full app tour</strong>—each beat floats
                above the exact surface it describes—then open the <strong className="text-foreground">manual chapters</strong>{' '}
                when you want depth (integrations, OnlyFans, troubleshooting).
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild className="gap-2 shadow-lg shadow-primary/15">
                <Link href="/dashboard/welcome?openTour=1">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Launch live tour
                </Link>
              </Button>
              <Button variant="outline" asChild className="gap-2 border-primary/25 bg-background/60 backdrop-blur-sm">
                <Link href="#guide-orbit-full-01">
                  <Compass className="h-4 w-4" aria-hidden />
                  Start scrolling
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-border/60 bg-muted/15 backdrop-blur-sm">
          <CardContent className="flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm">
            <span className="text-muted-foreground">Jump to reference:</span>
            <a href="#getting-started" className="text-primary underline-offset-4 hover:underline">
              Getting started
            </a>
            <Link href="/dashboard/community" className="text-primary underline-offset-4 hover:underline">
              Suggestions
            </Link>
            <a href="#divine-manager" className="text-primary underline-offset-4 hover:underline">
              Divine Manager
            </a>
            <a href="#troubleshooting" className="text-primary underline-offset-4 hover:underline">
              Troubleshooting
            </a>
          </CardContent>
        </Card>
      </motion.header>

      <section className="mb-20 scroll-mt-28">
        <GuideOrbitJourney />
      </section>

      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <BookOpen className="h-7 w-7 text-primary" aria-hidden />
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Deep reference</h2>
            <p className="text-sm text-muted-foreground">
              Long-form chapters—expand a section or use the links above.
            </p>
          </div>
        </div>

        <Accordion type="multiple" className="rounded-2xl border border-border/80 bg-card/30">
          <AccordionItem value="reference" className="border-0 px-1">
            <AccordionTrigger className="px-4 py-4 text-left font-serif text-lg hover:no-underline">
              Open full manual (integrations, AI, troubleshooting…)
            </AccordionTrigger>
            <AccordionContent className="border-t border-border/50 px-2 pb-6 pt-2 sm:px-4">
              <GuideReferenceSections />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.section>
    </div>
  )
}
