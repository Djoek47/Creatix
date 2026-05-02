'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
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

type HomeTileKey = 'messages' | 'aiStudio' | 'protection' | 'wellBeing' | 'creditsPlanner'

function homeTileTitle(t: (key: string) => string, key: HomeTileKey): string {
  return t(`${key}.title`)
}

function homeTileDescription(t: (key: string) => string, key: HomeTileKey): string {
  return t(`${key}.description`)
}

const tiles = [
  {
    href: '/dashboard/messages',
    tileKey: 'messages' as const satisfies HomeTileKey,
    icon: MessageSquare,
    accent: 'from-circe/20 to-circe/5 border-circe/25 hover:border-circe/45',
    iconClass: 'text-circe',
  },
  {
    href: '/dashboard/ai-studio',
    tileKey: 'aiStudio' as const satisfies HomeTileKey,
    icon: Sparkles,
    accent: 'from-gold/15 to-amber-500/5 border-gold/25 hover:border-gold/45',
    iconClass: 'text-gold',
  },
  {
    href: '/dashboard/protection',
    tileKey: 'protection' as const satisfies HomeTileKey,
    icon: Shield,
    accent: 'from-primary/15 to-primary/5 border-primary/20 hover:border-primary/40',
    iconClass: 'text-primary',
  },
  {
    href: '/dashboard/well-being',
    tileKey: 'wellBeing' as const satisfies HomeTileKey,
    icon: HeartPulse,
    accent: 'from-venus/15 to-venus/5 border-venus/25 hover:border-venus/45',
    iconClass: 'text-venus',
  },
  {
    href: '/dashboard/credits-planner',
    tileKey: 'creditsPlanner' as const satisfies HomeTileKey,
    icon: BarChart3,
    accent: 'from-gold/15 to-purple-500/5 border-gold/25 hover:border-gold/45',
    iconClass: 'text-gold',
  },
] as const

export type DashboardCommandTilesProps = {
  accent?: DivineDashboardPreset['accent']
  tierIndex?: number | null
  nonApiProtectionTier?: boolean
}

const tileStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}
const tileItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.25, 0.1, 0.25, 1] as const } },
}

export function DashboardCommandTiles({ accent, tierIndex, nonApiProtectionTier = false }: DashboardCommandTilesProps) {
  const t = useTranslations('dashboard.homeTiles')
  const reduce = useReducedMotion()
  const tilesActive = nonApiProtectionTier
    ? tiles.filter((t) => t.href !== '/dashboard/messages' && t.href !== '/dashboard/ai-studio')
    : [...tiles]
  const tierSheen =
    tierIndex != null && Number.isFinite(tierIndex) && Math.floor(tierIndex) >= 8
      ? 'shadow-[0_0_48px_-16px_rgba(168,85,247,0.18)]'
      : tierIndex != null && Number.isFinite(tierIndex) && Math.floor(tierIndex) >= 4
        ? 'shadow-[0_0_44px_-18px_rgba(234,179,8,0.14)]'
        : 'shadow-[0_0_40px_-18px_rgba(6,182,212,0.12)]'

  return (
    <div className="space-y-4">
      <motion.div
        className={cn(
          'grid gap-3.5 sm:grid-cols-2 sm:gap-4',
          tilesActive.length <= 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-5',
          tierSheen,
        )}
        variants={reduce ? undefined : tileStagger}
        initial={reduce ? false : 'hidden'}
        animate={reduce ? false : 'show'}
      >
        {tilesActive.map((tile) => {
          const boosted =
            (accent === 'circe' && tile.href === '/dashboard/messages') ||
            (accent === 'gold' && tile.href === '/dashboard/ai-studio') ||
            (accent === 'venus' && tile.href === '/dashboard/well-being')
          return (
            <motion.div key={tile.href} variants={reduce ? undefined : tileItem} className="min-w-0">
            <Link
              href={tile.href}
              className={cn(
                'group relative block overflow-hidden rounded-[1.25rem] border border-white/[0.32] bg-white/[0.16] p-5 shadow-[0_10px_36px_-22px_rgba(15,23,42,0.14)] backdrop-blur-[10px] backdrop-saturate-[1.06] transition-[box-shadow,border-color] duration-300 md:p-6',
                'dark:border-white/[0.11] dark:bg-slate-950/[0.18] dark:shadow-[0_14px_44px_-26px_rgba(0,0,0,0.38)]',
                'hover:border-white/55 hover:shadow-[0_20px_50px_-22px_rgba(15,23,42,0.28)] dark:hover:border-white/[0.14]',
                'bg-gradient-to-br',
                tile.accent,
                boosted && 'ring-1 ring-gold/25 dark:ring-gold/30',
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-violet-500/[0.04] via-transparent to-amber-500/[0.05] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-amber-400/[0.08] to-fuchsia-500/[0.07] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex items-start gap-4">
                <div
                  className={cn(
                    'rounded-2xl border border-white/40 bg-background/35 p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] backdrop-blur-[8px] transition-[transform,box-shadow] duration-300 dark:border-white/[0.12] dark:bg-white/[0.04]',
                    'group-hover:shadow-md',
                    tile.iconClass,
                  )}
                >
                  <tile.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[15px] font-semibold tracking-tight text-foreground">
                    {homeTileTitle(t, tile.tileKey)}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground/90">
                    {homeTileDescription(t, tile.tileKey)}
                  </p>
                </div>
              </div>
            </Link>
            </motion.div>
          )
        })}
      </motion.div>
      {!nonApiProtectionTier ? (
        <div className="flex justify-end pt-1">
          <Link
            href="/dashboard/divine-manager"
            className="inline-flex items-center gap-2 rounded-full border border-border/35 bg-background/50 px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-colors duration-200 hover:border-border/55 hover:bg-background/65 hover:text-foreground dark:border-white/[0.10] dark:bg-white/[0.05]"
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            {t('divineManager')}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
