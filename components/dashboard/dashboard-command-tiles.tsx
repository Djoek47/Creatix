'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MessageSquare,
  Sparkles,
  Shield,
  HeartPulse,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DivineDashboardPreset } from '@/lib/divine-manager'

const tiles = [
  {
    href: '/dashboard/messages',
    title: 'Messages',
    description: 'Conversations and mass outreach',
    icon: MessageSquare,
    accent: 'from-circe/20 to-circe/5 border-circe/25 hover:border-circe/45',
    iconClass: 'text-circe',
  },
  {
    href: '/dashboard/ai-studio',
    title: 'AI Studio',
    description: 'Tools, churn insight, and creative edge',
    icon: Sparkles,
    accent: 'from-gold/15 to-amber-500/5 border-gold/25 hover:border-gold/45',
    iconClass: 'text-gold',
  },
  {
    href: '/dashboard/protection',
    title: 'Protection',
    description: 'Leaks, watermarks, and peace of mind',
    icon: Shield,
    accent: 'from-primary/15 to-primary/5 border-primary/20 hover:border-primary/40',
    iconClass: 'text-primary',
  },
  {
    href: '/dashboard/well-being',
    title: 'Well-being',
    description: 'Rhythm, pressure, and balance',
    icon: HeartPulse,
    accent: 'from-venus/15 to-venus/5 border-venus/25 hover:border-venus/45',
    iconClass: 'text-venus',
  },
  {
    href: '/dashboard/credits-planner',
    title: 'Credits Planner',
    description: 'Smart premium credit allocation',
    icon: BarChart3,
    accent: 'from-gold/15 to-purple-500/5 border-gold/25 hover:border-gold/45',
    iconClass: 'text-gold',
  },
] as const

export type DashboardCommandTilesProps = {
  accent?: DivineDashboardPreset['accent']
  tierIndex?: number | null
}

const tileStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}
const tileItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
}

export function DashboardCommandTiles({ accent, tierIndex }: DashboardCommandTilesProps) {
  const reduce = useReducedMotion()
  const tierSheen =
    tierIndex != null && Number.isFinite(tierIndex) && Math.floor(tierIndex) >= 8
      ? 'shadow-[0_0_40px_-12px_rgba(168,85,247,0.25)]'
      : tierIndex != null && Number.isFinite(tierIndex) && Math.floor(tierIndex) >= 4
        ? 'shadow-[0_0_36px_-14px_rgba(234,179,8,0.2)]'
        : 'shadow-[0_0_32px_-14px_rgba(6,182,212,0.18)]'

  return (
    <div className="space-y-3">
      <motion.div
        className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-5', tierSheen)}
        variants={reduce ? undefined : tileStagger}
        initial={reduce ? false : 'hidden'}
        animate={reduce ? false : 'show'}
      >
        {tiles.map((tile) => {
          const boosted =
            (accent === 'circe' && tile.href === '/dashboard/messages') ||
            (accent === 'gold' && tile.href === '/dashboard/ai-studio') ||
            (accent === 'venus' && tile.href === '/dashboard/well-being')
          return (
            <motion.div key={tile.href} variants={reduce ? undefined : tileItem} className="min-w-0">
            <Link
              href={tile.href}
              className={cn(
                'group relative block overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-shadow duration-300 md:p-5',
                'shadow-sm hover:shadow-lg hover:shadow-amber-500/5',
                'hover:-translate-y-0.5 motion-safe:transition-transform motion-safe:duration-300',
                tile.accent,
                boosted && 'ring-1 ring-gold/30 md:scale-[1.01]',
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-violet-500/6 via-transparent to-amber-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/10 to-fuchsia-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start gap-3">
                <div
                  className={cn(
                    'rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.05] group-hover:shadow-md',
                    tile.iconClass,
                  )}
                >
                  <tile.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight">{tile.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tile.description}</p>
                </div>
              </div>
            </Link>
            </motion.div>
          )
        })}
      </motion.div>
      <div className="flex justify-end">
        <Link
          href="/dashboard/divine-manager"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:border-border hover:text-foreground"
        >
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
          Divine Manager
        </Link>
      </div>
    </div>
  )
}
