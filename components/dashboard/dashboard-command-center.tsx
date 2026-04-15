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
  if (mood === 'minimal') return 'ring-1 ring-border/50'
  if (mood === 'creative') return 'ring-1 ring-gold/20'
  return 'ring-1 ring-border/35'
}

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
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
        'relative isolate overflow-hidden rounded-3xl border border-border/45 bg-background/70 shadow-lg md:bg-background/80 md:shadow-2xl',
        'backdrop-blur-sm md:backdrop-blur-xl',
        moodRing,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90 md:opacity-100',
          ambient,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] md:opacity-[0.055] dark:opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="relative z-[1] space-y-8 sm:space-y-10 px-3 py-6 sm:px-5 sm:py-8 md:px-8 md:py-10">
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
            className="flex flex-col gap-8 sm:gap-10"
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
