'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DivineDashboardPreset } from '@/lib/divine-manager'

const ENTRANCE_SESSION_KEY = 'dashboard_entrance_done'

function tierAmbientClass(tier: number | null | undefined): string {
  if (tier == null || !Number.isFinite(tier)) {
    return 'from-circe/[0.08] via-transparent to-gold/[0.06]'
  }
  const t = Math.max(0, Math.min(10, Math.floor(tier)))
  if (t <= 3) return 'from-circe/[0.14] via-transparent to-circe/[0.04]'
  if (t <= 7) return 'from-gold/[0.12] via-transparent to-amber-500/[0.05]'
  return 'from-venus/[0.12] via-transparent to-venus/[0.05]'
}

function moodShellClass(mood: DivineDashboardPreset['mood'] | undefined): string {
  if (mood === 'minimal') return 'ring-1 ring-border/30 dark:ring-white/[0.08]'
  if (mood === 'creative') return 'ring-1 ring-gold/15 dark:ring-gold/20'
  return 'ring-1 ring-border/25 dark:ring-white/[0.06]'
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
    transition: { duration: 0.42, ease: [0.25, 0.1, 0.25, 1] },
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
        'relative isolate overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/42 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-2xl backdrop-saturate-150',
        'dark:border-white/[0.10] dark:bg-slate-950/38 dark:shadow-[0_28px_90px_-36px_rgba(0,0,0,0.62)]',
        moodRing,
      )}
    >
      {/* CSS-only depth — not the login scenic photos; pairs with shared starfield below */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0',
          'bg-[radial-gradient(ellipse_90%_60%_at_10%_-5%,rgba(139,92,246,0.14),transparent_52%),radial-gradient(ellipse_75%_45%_at_100%_105%,rgba(251,191,36,0.09),transparent_48%),radial-gradient(ellipse_80%_70%_at_50%_45%,rgba(248,250,252,0.92),rgba(241,245,249,0.55))]',
          'dark:bg-[radial-gradient(ellipse_88%_58%_at_8%_0%,rgba(109,40,217,0.26),transparent_50%),radial-gradient(ellipse_72%_48%_at_96%_100%,rgba(180,83,9,0.14),transparent_46%),radial-gradient(ellipse_100%_80%_at_50%_50%,rgba(15,23,42,0.94),rgba(2,6,23,0.72))]',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0 bg-gradient-to-br opacity-[0.52] md:opacity-[0.62]',
          ambient,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.028] md:opacity-[0.045] dark:opacity-[0.055]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/[0.12]" aria-hidden />
      <div className="relative z-[1] space-y-10 sm:space-y-12 px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
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
