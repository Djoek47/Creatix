'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DivineDashboardPreset } from '@/lib/divine-manager'

const ENTRANCE_SESSION_KEY = 'dashboard_entrance_done'

function tierAmbientClass(tier: number | null | undefined): string {
  if (tier == null || !Number.isFinite(tier)) {
    return 'from-circe/[0.035] via-transparent to-gold/[0.03]'
  }
  const t = Math.max(0, Math.min(10, Math.floor(tier)))
  if (t <= 3) return 'from-circe/[0.05] via-transparent to-circe/[0.02]'
  if (t <= 7) return 'from-gold/[0.045] via-transparent to-amber-500/[0.02]'
  return 'from-venus/[0.045] via-transparent to-venus/[0.02]'
}

function moodShellClass(mood: DivineDashboardPreset['mood'] | undefined): string {
  if (mood === 'minimal') return 'ring-1 ring-black/[0.04] dark:ring-white/[0.07]'
  if (mood === 'creative') return 'ring-1 ring-amber-500/10 dark:ring-amber-400/12'
  return 'ring-1 ring-black/[0.035] dark:ring-white/[0.06]'
}

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

export type DashboardCommandCenterProps = {
  tierIndex?: number | null
  preset?: DivineDashboardPreset | null
  hero: ReactNode
  commandStrip: ReactNode
  widgetRegion: ReactNode
}

export function DashboardCommandCenter({
  tierIndex,
  preset,
  hero,
  commandStrip,
  widgetRegion,
}: DashboardCommandCenterProps) {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [runEntrance, setRunEntrance] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || reduced) return
    try {
      if (sessionStorage.getItem(ENTRANCE_SESSION_KEY)) return
    } catch {
      return
    }
    setRunEntrance(true)
  }, [mounted, reduced])

  useEffect(() => {
    if (!runEntrance || reduced) return
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(ENTRANCE_SESSION_KEY, '1')
      } catch {
        // ignore
      }
    }, 920)
    return () => window.clearTimeout(t)
  }, [runEntrance, reduced])

  const ambient = tierAmbientClass(tierIndex ?? null)
  const moodRing = moodShellClass(preset?.mood)

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-[1.1rem] sm:rounded-[1.75rem]',
        /* Thinner glass so the celestial canvas reads through; edge definition from border + inset highlight */
        'border border-white/[0.28] bg-white/[0.14] shadow-[0_8px_40px_-16px_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.55)]',
        'backdrop-blur-[12px] backdrop-saturate-[1.08]',
        'dark:border-white/[0.11] dark:bg-slate-950/[0.16] dark:shadow-[0_14px_48px_-20px_rgba(0,0,0,0.42),inset_0_1px_0_0_rgba(255,255,255,0.09)]',
        moodRing,
      )}
    >
      {/* Light veil only — keep stars/lines legible behind the panel */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0',
          'bg-[radial-gradient(ellipse_95%_70%_at_50%_-15%,rgba(255,255,255,0.38),transparent_58%),radial-gradient(ellipse_80%_55%_at_100%_100%,rgba(241,245,249,0.2),transparent_52%)]',
          'dark:bg-[radial-gradient(ellipse_90%_65%_at_48%_0%,rgba(255,255,255,0.035),transparent_55%),radial-gradient(ellipse_85%_60%_at_0%_100%,rgba(148,163,184,0.03),transparent_50%)]',
        )}
        aria-hidden
      />
      {/* Soft liquid highlights — low opacity so constellations stay visible */}
      <div
        className={cn(
          'command-glass-drift-a pointer-events-none absolute -left-[18%] -top-[32%] z-0 h-[min(78vw,520px)] w-[min(78vw,520px)] rounded-full',
          'bg-gradient-to-br from-white/22 via-white/[0.06] to-transparent blur-3xl dark:from-white/[0.06] dark:via-white/[0.02] dark:to-transparent',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'command-glass-drift-b pointer-events-none absolute -bottom-[38%] -right-[22%] z-0 h-[min(85vw,560px)] w-[min(72vw,480px)] rounded-full',
          'bg-gradient-to-tl from-slate-300/12 via-slate-400/[0.04] to-transparent blur-3xl dark:from-violet-400/[0.05] dark:via-violet-500/[0.015] dark:to-transparent',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'command-glass-drift-c pointer-events-none absolute bottom-[-18%] left-[12%] z-0 h-[min(62vw,420px)] w-[min(62vw,420px)] rounded-full',
          'bg-gradient-to-tr from-amber-100/14 via-amber-200/[0.05] to-transparent blur-3xl dark:from-amber-400/[0.04] dark:via-transparent dark:to-transparent',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0 bg-gradient-to-br opacity-[0.14] md:opacity-[0.18]',
          ambient,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.014] dark:opacity-[0.022]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/[0.14]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-8 bottom-0 z-[2] h-px bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.05]"
        aria-hidden
      />
      <div className="relative z-[1] space-y-7 px-3 py-5 sm:space-y-10 sm:px-6 sm:py-10 md:space-y-12 md:px-10 md:py-12">
        {!runEntrance || reduced ? (
          <>
            {hero}
            {commandStrip}
            {widgetRegion}
          </>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-10 sm:gap-12"
          >
            <motion.div variants={item}>{hero}</motion.div>
            <motion.div variants={item}>{commandStrip}</motion.div>
            <motion.div variants={item}>{widgetRegion}</motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
