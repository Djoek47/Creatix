'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { runOnlyFansFullChatScan } from '@/lib/fans/onlyfans-chat-scan-client'
import { postQuickFanPlatformSync } from '@/lib/fans/post-quick-fan-sync'
import { runAllThreadInsightBatches } from '@/lib/fans/thread-insights-batch-client'
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FansFilter } from './fans-page-client'

/** Primary line on the trigger — calm, scannable; menu holds nuance. */
const TRIGGER_LABELS: Record<FansFilter, string> = {
  database: 'All synced',
  expiring: 'Renewals soon',
  active: 'Active now',
  expired: 'Recently ended',
  latest: 'Newest first',
  top: 'Top spenders',
}

function filterTriggerLabel(filter: FansFilter): string {
  return TRIGGER_LABELS[filter]
}

function filterDataSourceLine(filter: FansFilter): string {
  return filter === 'database' || filter === 'expiring' ? 'Stored in Circe' : 'Live from platforms'
}

interface FansHeaderProps {
  filter?: FansFilter
  onFilterChange?: (f: FansFilter) => void
  hasOnlyFansConnected?: boolean
  hasFanslyConnected?: boolean
  /** OnlyFans or Fansly — enables quick platform sync. */
  hasFanPlatformsConnected?: boolean
  loadingLive?: boolean
  /** Status line below the header (progress / result). */
  onSyncStatus?: (message: string | null) => void
}

export function FansHeader({
  filter = 'database',
  onFilterChange,
  hasOnlyFansConnected = false,
  hasFanslyConnected = false,
  hasFanPlatformsConnected = false,
  loadingLive = false,
  onSyncStatus,
}: FansHeaderProps = {}) {
  const router = useRouter()
  const [syncBusy, setSyncBusy] = useState(false)

  const liveEnabled = hasOnlyFansConnected || hasFanslyConnected

  async function handleQuickSync() {
    if (!hasFanPlatformsConnected) {
      onSyncStatus?.('Connect OnlyFans or Fansly in Settings to sync.')
      return
    }
    setSyncBusy(true)
    onSyncStatus?.('Syncing subscribers and stats from connected platforms…')
    try {
      await postQuickFanPlatformSync()
      onSyncStatus?.('Quick sync finished.')
      router.refresh()
    } catch {
      onSyncStatus?.('Quick sync failed — try again or reconnect the platform.')
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleFullCrmUpdate() {
    if (!hasFanPlatformsConnected) {
      onSyncStatus?.('Connect a platform first.')
      return
    }
    setSyncBusy(true)
    onSyncStatus?.('Step 1/2: syncing subscribers and stats…')
    try {
      await postQuickFanPlatformSync()
      router.refresh()
      if (!hasOnlyFansConnected) {
        onSyncStatus?.('Quick sync done. Connect OnlyFans to include all DM threads in CRM.')
        return
      }
      onSyncStatus?.('Step 2/2: walking every OnlyFans DM and saving subscription data to CRM…')
      const chat = await runOnlyFansFullChatScan((m) => onSyncStatus?.(m))
      if (chat.error) {
        onSyncStatus?.(chat.error)
        return
      }
      if (chat.abortedRateLimit) {
        return
      }
      onSyncStatus?.(
        `Full CRM update done: ${chat.totalSynced} profiles from DMs${chat.totalFailed ? ` (${chat.totalFailed} errors)` : ''}.`,
      )
      router.refresh()
    } catch {
      onSyncStatus?.('Full CRM update failed.')
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleThreadInsightsAll() {
    if (filter !== 'database') {
      onSyncStatus?.('Switch the fan list to “All synced” first, then run this again.')
      return
    }
    if (!hasOnlyFansConnected) {
      onSyncStatus?.('Connect OnlyFans to refresh thread insights.')
      return
    }
    setSyncBusy(true)
    onSyncStatus?.('Refreshing stored thread insights for all CRM fans (may take a while)…')
    try {
      const r = await runAllThreadInsightBatches((m) => onSyncStatus?.(m))
      if (r.error) {
        onSyncStatus?.(r.error)
        return
      }
      router.refresh()
    } catch {
      onSyncStatus?.('Thread insights refresh failed.')
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap sm:ml-auto">
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1.5 rounded-full border-border/40 min-h-[44px] px-4 shadow-none hover:bg-muted/40 sm:min-h-[2.5rem]"
                disabled={syncBusy}
                title="Sync subscribers, all DM threads, or thread insights"
              >
                {syncBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden sm:inline">Sync</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)]">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                One menu — pick how deep to update the CRM
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!hasFanPlatformsConnected || syncBusy}
                onClick={() => void handleQuickSync()}
              >
                <span className="font-medium">Quick sync</span>
                <span className="block text-xs text-muted-foreground">
                  Subscribers list + analytics (OnlyFans & Fansly)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasFanPlatformsConnected || syncBusy}
                onClick={() => void handleFullCrmUpdate()}
              >
                <span className="font-medium">Full CRM update</span>
                <span className="block text-xs text-muted-foreground">
                  Quick sync, then walk every OnlyFans DM (subs, expiry, spend). Fansly has no full DM walk yet—use
                  Quick sync for Fansly subscribers.
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={
                  !hasOnlyFansConnected || filter !== 'database' || syncBusy
                }
                onClick={() => void handleThreadInsightsAll()}
              >
                <span className="font-medium">Thread insights (full pass)</span>
                <span className="block text-xs text-muted-foreground">
                  Runs on CRM when the table shows &quot;All synced&quot; fans.
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  '!flex h-auto min-h-[44px] w-full max-w-[min(100%,18rem)] items-start justify-between gap-3 rounded-full whitespace-normal sm:w-auto',
                  'border-border/40 bg-background/50 px-4 py-2.5 shadow-none',
                  'transition-[background-color,border-color,color] duration-200 hover:bg-muted/40 sm:min-h-[2.5rem] sm:min-w-[12.5rem] sm:py-2',
                )}
                title="Choose CRM data or a live slice from connected platforms"
                aria-label={`Fan list: ${filterTriggerLabel(filter)}. ${filterDataSourceLine(filter)}.`}
                type="button"
                disabled={syncBusy}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                    aria-hidden
                  >
                    Fan list
                  </span>
                  <span className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                    {filterTriggerLabel(filter)}
                  </span>
                  <span className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                    {filterDataSourceLine(filter)}
                  </span>
                </span>
                <ChevronDown
                  className="mt-1 h-4 w-4 shrink-0 opacity-45"
                  strokeWidth={2}
                  aria-hidden
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-[min(calc(100vw-2rem),21rem)] rounded-2xl border-border/50 p-2 shadow-lg"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuLabel className="px-3 pb-2 pt-1.5 text-[11px] font-medium leading-snug text-muted-foreground">
                What appears in the table
              </DropdownMenuLabel>

              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) => onFilterChange?.(value as FansFilter)}
              >
                <DropdownMenuGroup className="space-y-0.5">
                  <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/90">
                    In Circe CRM
                  </div>
                  <DropdownMenuRadioItem
                    value="database"
                    disabled={syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        All synced fans
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">
                        Full searchable list · default
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="expiring"
                    disabled={syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        Renewals soon
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">
                        Ending within 14 days · CRM dates
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-2 bg-border/60" />

                <DropdownMenuGroup className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 px-3 pb-1.5 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/90">
                      Live snapshot
                    </span>
                    {loadingLive ? (
                      <span className="text-[10px] font-normal text-muted-foreground">Updating…</span>
                    ) : null}
                  </div>

                  {!liveEnabled ? (
                    <p className="px-3 pb-2 text-[12px] leading-relaxed text-muted-foreground">
                      Connect{' '}
                      <Link
                        href="/dashboard/settings?tab=integrations"
                        className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                      >
                        OnlyFans or Fansly
                      </Link>{' '}
                      for smaller live slices from each platform&apos;s API.
                    </p>
                  ) : null}

                  <DropdownMenuRadioItem
                    value="active"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        Active subscriptions
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">
                        Currently billed as active (~50 per request)
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="expired"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        Recently expired
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">
                        Live list · may differ slightly from nightly CRM sync
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="latest"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        Newest first
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">
                        Ordering from each platform&apos;s API
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="top"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        Highest spend
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">
                        OnlyFans exposes spend · Fansly may mirror active cohort
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                </DropdownMenuGroup>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator className="my-2 bg-border/60" />

              <p className="px-3 pb-1.5 text-[11px] leading-relaxed text-muted-foreground">
                CRM lists scale for search and bulk work. Live uses quick API batches for freshness.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
