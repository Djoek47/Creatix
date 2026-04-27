import Link from 'next/link'
import { ConnectedPlatforms } from '@/components/dashboard/connected-platforms'
import { cn } from '@/lib/utils'
import type { DivineDashboardPreset } from '@/lib/divine-manager'
import { getNonApiUpgradeMessage } from '@/lib/plan-capabilities'

interface DashboardHeroProps {
  planLabel: string | null
  hasConnectedPlatforms: boolean
  mood?: DivineDashboardPreset['mood']
  accent?: DivineDashboardPreset['accent']
  tierIndex?: number | null
  /** Protection-only tier: no creator API — curated copy and hide live platform chips. */
  nonApiProtectionTier?: boolean
}

function heroGradient(accent: DivineDashboardPreset['accent'] | undefined): string {
  if (accent === 'circe') return 'from-circe/[0.12] via-background to-circe/[0.05]'
  if (accent === 'venus') return 'from-venus/[0.12] via-background to-venus/[0.05]'
  if (accent === 'gold') return 'from-gold/[0.1] via-background to-amber-500/[0.06]'
  return 'from-circe/[0.07] via-background to-venus/[0.07]'
}

function titleGradient(accent: DivineDashboardPreset['accent'] | undefined): string {
  if (accent === 'circe') return 'from-circe via-foreground to-circe/80'
  if (accent === 'venus') return 'from-venus via-foreground to-gold'
  if (accent === 'gold') return 'from-gold via-foreground to-amber-600'
  return 'from-circe via-foreground to-gold'
}

function subtitleForMood(mood: DivineDashboardPreset['mood'] | undefined): string {
  if (mood === 'minimal') return 'Signal over noise — keep the essentials in view.'
  if (mood === 'creative') return 'Ideas, tools, and rhythm when you are building the next drop.'
  return 'Revenue, fans, and protection in one rhythm — move fast where it matters.'
}

export function DashboardHero({
  planLabel,
  hasConnectedPlatforms,
  mood,
  accent,
  tierIndex,
  nonApiProtectionTier = false,
}: DashboardHeroProps) {
  const bg = heroGradient(accent)
  const title = titleGradient(accent)
  const subtitle = subtitleForMood(mood)
  const tierBand =
    tierIndex != null && Number.isFinite(tierIndex) ? Math.max(0, Math.min(10, Math.floor(tierIndex))) : null
  const tierGlow =
    tierBand === null ? 'bg-circe/12' : tierBand <= 4 ? 'bg-circe/15' : tierBand <= 8 ? 'bg-gold/12' : 'bg-venus/14'

  return (
    <div
      id="dashboard-platform-sync"
      className={cn(
        'relative scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-white/45 bg-white/44 p-7 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl backdrop-saturate-150 constellation-bg md:p-10',
        'bg-gradient-to-br dark:border-white/[0.09] dark:bg-slate-950/44 dark:shadow-[0_24px_70px_-32px_rgba(0,0,0,0.55)]',
        bg,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-[64px] opacity-80 md:-right-20 md:-top-20 md:h-60 md:w-60 md:opacity-90',
          tierGlow,
        )}
      />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-venus/[0.07] blur-[72px] dark:bg-venus/[0.09]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.14]" aria-hidden />
      <div className="relative flex flex-col gap-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
              Command centre
            </p>
            <h1 className="mt-3 font-serif text-[1.85rem] font-medium leading-[1.1] tracking-tight text-balance md:text-[2.65rem] md:leading-[1.06]">
              <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', title)}>Your command centre</span>
            </h1>
            <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-muted-foreground/90 md:text-[1.05rem] md:leading-[1.55]">
              {subtitle}
            </p>
            {nonApiProtectionTier ? (
              <p className="mt-4 max-w-[34rem] text-sm leading-relaxed text-muted-foreground">
                {getNonApiUpgradeMessage()}{' '}
                <Link
                  href="/dashboard/settings?tab=billing"
                  className="font-medium text-foreground underline decoration-primary/35 underline-offset-[5px] transition-colors hover:text-primary"
                >
                  Upgrade to full Creatix
                </Link>
                .
              </p>
            ) : (
              !hasConnectedPlatforms && (
                <p className="mt-4 text-sm leading-relaxed text-amber-800/90 dark:text-amber-400/95">
                  <Link
                    href="/dashboard/settings?tab=integrations"
                    className="font-medium text-gold underline decoration-gold/40 underline-offset-[5px] transition-colors hover:text-foreground hover:decoration-foreground/30 dark:text-gold"
                  >
                    Connect your platforms
                  </Link>{' '}
                  to unlock live stats and sync.
                </p>
              )
            )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-end sm:gap-5">
            {planLabel ? (
              <span className="inline-flex items-center justify-center rounded-full border border-border/35 bg-background/55 px-4 py-2 text-[12px] font-medium text-muted-foreground shadow-sm backdrop-blur-md dark:border-white/[0.10] dark:bg-white/[0.06] sm:justify-start">
                Plan:
                <span className="ml-1.5 tabular-nums text-foreground">{planLabel}</span>
              </span>
            ) : null}
            {!nonApiProtectionTier ? (
              <div className="flex flex-col items-end gap-2">
                <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/85 sm:block">
                  Connected platforms
                </span>
                <ConnectedPlatforms />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
