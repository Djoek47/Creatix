import Link from 'next/link'
import { ConnectedPlatforms } from '@/components/dashboard/connected-platforms'

interface DashboardHeroProps {
  planLabel: string | null
  hasConnectedPlatforms: boolean
}

export function DashboardHero({ planLabel, hasConnectedPlatforms }: DashboardHeroProps) {
  return (
    <div
      id="dashboard-platform-sync"
      className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-circe/[0.07] via-background to-venus/[0.07] constellation-bg p-6 shadow-sm md:p-8"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-circe/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-venus/15 blur-3xl" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              <span className="bg-gradient-to-r from-circe via-foreground to-gold bg-clip-text text-transparent">
                Your command centre
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              Revenue, fans, and protection in one rhythm — move fast where it matters.
            </p>
            {!hasConnectedPlatforms && (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                <Link
                  href="/dashboard/settings?tab=integrations"
                  className="font-medium underline decoration-amber-600/50 underline-offset-4 transition-colors hover:text-foreground"
                >
                  Connect your platforms
                </Link>{' '}
                to unlock live stats and sync.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-end">
            {planLabel ? (
              <span className="inline-flex items-center justify-center rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur sm:justify-start">
                Plan:
                <span className="ml-1.5 text-foreground">{planLabel}</span>
              </span>
            ) : null}
            <div className="flex flex-col items-end gap-1">
              <span className="hidden text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:block">
                Connected platforms
              </span>
              <ConnectedPlatforms />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
