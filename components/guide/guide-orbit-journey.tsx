'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AtSign,
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  Crown,
  Filter,
  GitMerge,
  HeartPulse,
  LayoutDashboard,
  Library,
  Map as MapIcon,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Moon,
  Plug,
  Route,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  UsersRound,
  Wand2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { GuideOrbIconKey, GuideOrbStep, GuideOrbTheme } from '@/lib/guide-onboarding-data'
import { GUIDE_ORBIT_STEPS } from '@/lib/guide-onboarding-data'

const ICON_MAP: Record<GuideOrbIconKey, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Map: MapIcon,
  LayoutDashboard,
  Crown,
  Calendar,
  HeartPulse,
  MessageSquare,
  Megaphone,
  Share2,
  Library,
  Wand2,
  Zap,
  Bot,
  GitMerge,
  BarChart3,
  TrendingUp,
  Moon,
  Shield,
  ShieldCheck,
  Users,
  Filter,
  MessageCircle,
  AtSign,
  UsersRound,
  Sun,
  BookOpen,
  Settings,
  Plug,
  Route,
}

const THEME_STYLES: Record<
  GuideOrbTheme,
  {
    callout: string
    glow: string
    pointer: string
    chip: string
    iconWrap: string
  }
> = {
  circe: {
    callout:
      'border-circe/35 bg-gradient-to-br from-circe/[0.12] via-card/90 to-background shadow-[0_0_40px_-8px_oklch(0.55_0.2_295_/_0.35)]',
    glow: 'from-circe/25 via-fuchsia-500/10 to-transparent',
    pointer: 'border-t-circe/55',
    chip: 'border-circe/40 bg-circe/[0.08]',
    iconWrap: 'bg-circe/20 text-circe-light',
  },
  venus: {
    callout:
      'border-amber-500/35 bg-gradient-to-br from-amber-500/[0.10] via-card/90 to-background shadow-[0_0_36px_-10px_oklch(0.78_0.14_85_/_0.35)]',
    glow: 'from-amber-400/20 via-amber-500/5 to-transparent',
    pointer: 'border-t-amber-500/50',
    chip: 'border-amber-500/35 bg-amber-500/[0.07]',
    iconWrap: 'bg-amber-500/20 text-amber-200',
  },
  neutral: {
    callout:
      'border-border/80 bg-gradient-to-br from-muted/50 via-card to-background shadow-lg shadow-black/10',
    glow: 'from-primary/15 via-transparent to-transparent',
    pointer: 'border-t-primary/45',
    chip: 'border-border/70 bg-muted/40',
    iconWrap: 'bg-primary/15 text-primary',
  },
  aurora: {
    callout:
      'border-primary/30 bg-gradient-to-br from-primary/[0.08] via-violet-500/[0.06] to-amber-500/[0.05] shadow-[0_0_44px_-12px_oklch(0.55_0.2_295_/_0.25)]',
    glow: 'from-primary/20 via-violet-400/10 to-amber-400/10',
    pointer: 'border-t-primary/50',
    chip: 'border-primary/35 bg-gradient-to-br from-primary/[0.07] to-violet-500/[0.05]',
    iconWrap: 'bg-gradient-to-br from-primary/25 to-violet-500/20 text-primary',
  },
}

function SubjectChip({
  step,
  theme,
}: {
  step: GuideOrbStep
  theme: GuideOrbTheme
}) {
  const Icon = ICON_MAP[step.iconKey] ?? Sparkles
  const t = THEME_STYLES[theme]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'relative flex min-h-[4.5rem] w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-sm',
        t.chip,
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/5 shadow-inner',
          t.iconWrap,
        )}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">In the app</p>
        <p className="truncate font-serif text-base font-semibold tracking-tight text-foreground">{step.subjectLabel}</p>
      </div>
      <div className="pointer-events-none absolute inset-x-8 -top-1 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
    </motion.div>
  )
}

function OrbitStepBlock({ step, stepNumber }: { step: GuideOrbStep; stepNumber: number }) {
  const theme = step.theme
  const t = THEME_STYLES[theme]
  const href = step.path ?? '#'

  return (
    <motion.article
      id={`guide-orbit-${step.id}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative scroll-mt-28"
    >
      <div className="flex flex-col items-center">
        {/* Callout ABOVE the subject (per design: narrative first, then pointer, then chip) */}
        <motion.div
          layout
          className={cn(
            'relative z-[1] w-full max-w-lg overflow-hidden rounded-2xl border p-5 md:p-6',
            t.callout,
          )}
        >
          <div
            className={cn(
              'pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-gradient-to-br opacity-90 blur-3xl',
              t.glow,
            )}
          />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(stepNumber).padStart(2, '0')} / {GUIDE_ORBIT_STEPS.length}
              </span>
              {theme === 'circe' && (
                <span className="rounded-full bg-circe/15 px-2 py-0.5 text-[10px] font-medium text-circe-light">
                  Circe lane
                </span>
              )}
              {theme === 'venus' && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                  Venus lane
                </span>
              )}
              {theme === 'aurora' && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Orbit
                </span>
              )}
              {theme === 'neutral' && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Core
                </span>
              )}
            </div>
            <h3 className="font-serif text-xl font-semibold tracking-tight md:text-2xl">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">{step.description}</p>
            {step.path ? (
              <div className="pt-2">
                <Button variant="secondary" size="sm" className="gap-1.5" asChild>
                  <Link href={href}>Open in app</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* Pointer */}
        <div className="relative z-0 flex h-6 flex-col items-center justify-end">
          <div
            className={cn(
              'h-0 w-0 border-x-[9px] border-t-[11px] border-x-transparent bg-transparent',
              t.pointer,
            )}
          />
          <div className="h-2 w-px bg-gradient-to-b from-border to-transparent" />
        </div>

        {/* Subject sits directly under the callout */}
        <SubjectChip step={step} theme={theme} />
      </div>
    </motion.article>
  )
}

export function GuideOrbitJourney() {
  const [filter, setFilter] = useState<'all' | GuideOrbTheme>('all')
  const steps = useMemo(() => {
    if (filter === 'all') return GUIDE_ORBIT_STEPS
    return GUIDE_ORBIT_STEPS.filter((s) => s.theme === filter)
  }, [filter])

  return (
    <div className="relative">
      {/* Ambient orbit rings (decorative) */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[520px] -translate-x-1/2 animate-guide-orbit-slow rounded-full border border-primary/10 opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[380px] w-[380px] -translate-x-1/2 animate-guide-orbit-fast rounded-full border border-amber-500/10 opacity-50" />

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">Orbital walkthrough</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Same story as the live tour—each card explains the step; the tile below is the exact area in the product it
            belongs to.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'circe', 'venus', 'neutral', 'aurora'] as const).map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={filter === k ? 'default' : 'outline'}
              className="rounded-full capitalize"
              onClick={() => setFilter(k === 'all' ? 'all' : k)}
            >
              {k === 'all' ? 'All steps' : k}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col gap-14 md:gap-16">
        <AnimatePresence mode="popLayout">
          {steps.map((step) => (
            <motion.div
              key={step.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <OrbitStepBlock
                step={step}
                stepNumber={GUIDE_ORBIT_STEPS.findIndex((s) => s.id === step.id) + 1}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  )
}
