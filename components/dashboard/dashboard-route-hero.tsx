'use client'

import { usePathname } from 'next/navigation'
import { resolveDashboardPageMeta, shouldShowDashboardRouteHero } from '@/lib/dashboard-page-meta'
import { Sparkles } from 'lucide-react'

export function DashboardRouteHero() {
  const pathname = usePathname()
  if (!shouldShowDashboardRouteHero(pathname)) return null
  const meta = resolveDashboardPageMeta(pathname)
  if (!meta) return null

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-amber-500/[0.04] px-5 py-6 shadow-sm sm:mb-8 sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-amber-400/25 via-primary/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-40 w-40 rounded-full bg-circe/10 blur-3xl dark:bg-circe/15" />
      <div className="relative flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary/90">
            <Sparkles className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
            {meta.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            <span className="bg-gradient-to-r from-foreground via-primary to-amber-700/90 bg-clip-text text-transparent dark:from-circe-light dark:via-primary dark:to-amber-200/85">
              {meta.title}
            </span>
          </h1>
          {meta.subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {meta.subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
