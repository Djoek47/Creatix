'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { resolveDashboardPageMeta, shouldShowDashboardRouteHero } from '@/lib/dashboard-page-meta'
import { useMessagesFocusChromeOptional } from '@/components/messages/messages-focus-chrome-context'
import { cn } from '@/lib/utils'
import { PenTool, Sparkles } from 'lucide-react'

export function DashboardRouteHero() {
  const pathname = usePathname()
  const tDash = useTranslations('dashboard')
  const focusChrome = useMessagesFocusChromeOptional()
  const zenMessages =
    (focusChrome?.focusMode === true || focusChrome?.workspaceBarCollapsed === true) &&
    (pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')) &&
    !pathname.startsWith('/dashboard/messages/mass')
  if (zenMessages) return null
  if (!shouldShowDashboardRouteHero(pathname)) return null
  const meta = resolveDashboardPageMeta(pathname)
  if (!meta?.heroKey) return null

  const hk = meta.heroKey
  const eyebrow = tDash(`heroes.${hk}.eyebrow`)
  const title = tDash(`heroes.${hk}.title`)
  const subtitle = tDash(`heroes.${hk}.subtitle`)

  if (meta.heroVariant === 'system') {
    return (
      <header className="mb-10 sm:mb-14">
        <div
          className={cn(
            'sticky top-0 z-20 border-b border-border/30 pb-4 sm:pb-5',
            'bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75',
            'dark:border-border/25 dark:bg-background/85',
          )}
        >
          <p className="text-sm font-normal text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-3 text-balance break-words font-sans text-[clamp(1.75rem,6.5vw,2.5rem)] font-semibold tracking-[-0.03em] text-foreground sm:mt-4 sm:text-[2.75rem] sm:leading-[1.06]">
            {title}
          </h1>
          {subtitle.trim() !== '' ? (
            <p className="mt-4 max-w-lg text-balance break-words text-base font-normal leading-[1.55] text-muted-foreground sm:text-[1.0625rem]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </header>
    )
  }

  if (meta.heroVariant === 'minimal') {
    return (
      <header className="mb-8 sm:mb-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/85 dark:text-muted-foreground/78">
          {eyebrow}
        </p>
        <h1 className="mt-2.5 max-w-[min(22ch,100%)] text-balance break-words font-serif text-2xl font-semibold tracking-[-0.02em] text-foreground sm:mt-3 sm:text-3xl md:text-4xl md:leading-[1.1] md:tracking-[-0.03em]">
          {title}
        </h1>
        {subtitle.trim() !== '' ? (
          <p className="mt-3 max-w-xl text-balance break-words text-[15px] leading-[1.55] tracking-[-0.01em] text-muted-foreground sm:mt-[0.875rem] sm:text-[0.94875rem]">
            {subtitle}
          </p>
        ) : null}
      </header>
    )
  }

  const aiTools = meta.heroVariant === 'ai-tools'

  if (aiTools) {
    return (
      <div className="group/aitools relative mb-6 overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-card to-purple-500/[0.07] px-5 py-6 shadow-[0_0_40px_-12px_rgba(168,85,247,0.35),0_0_32px_-16px_rgba(251,191,36,0.25)] sm:mb-8 sm:px-8 sm:py-7 dark:border-purple-500/20 dark:from-purple-950/40 dark:via-card dark:to-amber-950/25">
        <div className="constellation-bg pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.22]" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br from-amber-400/30 via-fuchsia-500/15 to-transparent blur-3xl transition-all duration-500 group-hover/aitools:from-pink-400/35 group-hover/aitools:via-cyan-400/20 group-hover/aitools:to-violet-500/20" />
        <div className="pointer-events-none absolute -bottom-28 left-0 h-44 w-52 rounded-full bg-purple-500/15 blur-3xl transition-all duration-500 group-hover/aitools:bg-cyan-500/10 dark:bg-purple-400/10" />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-600/90 dark:text-amber-200/80">
              <span className="relative flex shrink-0 items-center gap-0.5">
                <PenTool className="ai-tools-brand-icon h-3.5 w-3.5" aria-hidden />
                <Sparkles className="ai-tools-brand-icon-secondary h-3 w-3" aria-hidden />
              </span>
              {eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              <span className="ai-tools-wordmark">{title}</span>
            </h1>
            {subtitle.trim() !== '' ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-amber-500/[0.04] px-5 py-6 shadow-sm sm:mb-8 sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-amber-400/25 via-primary/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-40 w-40 rounded-full bg-circe/10 blur-3xl dark:bg-circe/15" />
      <div className="relative flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary/90">
            <Sparkles className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            <span className="bg-gradient-to-r from-foreground via-primary to-amber-700/90 bg-clip-text text-transparent dark:from-circe-light dark:via-primary dark:to-amber-200/85">
              {title}
            </span>
          </h1>
          {subtitle.trim() !== '' ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
