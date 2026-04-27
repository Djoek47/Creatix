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
        'relative scroll-mt-24 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br p-6 shadow-md constellation-bg md:rounded-3xl md:p-8 md:shadow-lg',
        bg,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl md:-right-24 md:-top-24 md:h-64 md:w-64',
          tierGlow,
        )}
      />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-venus/10 blur-3xl" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90">
              Command centre
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', title)}>Your command centre</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{subtitle}</p>
            {nonApiProtectionTier ? (
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                {getNonApiUpgradeMessage()}{' '}
                <Link
                  href="/dashboard/settings?tab=billing"
                  className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary"
                >
                  Upgrade to full Creatix
                </Link>
                .
              </p>
            ) : (
              !hasConnectedPlatforms && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                  <Link
                    href="/dashboard/settings?tab=integrations"
                    className="font-medium underline decoration-amber-600/50 underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Connect your platforms
                  </Link>{' '}
                  to unlock live stats and sync.
                </p>
              )
            )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-end">
            {planLabel ? (
              <span className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-inner backdrop-blur sm:justify-start">
                Plan:
                <span className="ml-1.5 text-foreground">{planLabel}</span>
              </span>
            ) : null}
            {!nonApiProtectionTier ? (
              <div className="flex flex-col items-end gap-1">
                <span className="hidden text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:block">
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
