'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { runOnlyFansFullChatScan } from '@/lib/fans/onlyfans-chat-scan-client'
import { runAllThreadInsightBatches } from '@/lib/fans/thread-insights-batch-client'
import { ChevronDown, Loader2, Search, Filter, Download, RefreshCw } from 'lucide-react'
import type { FansFilter } from './fans-page-client'

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

  async function quickPlatformSync(): Promise<void> {
    const [ofRes, flRes] = await Promise.all([
      fetch('/api/onlyfans/sync', { method: 'POST' }),
      fetch('/api/fansly/sync', { method: 'POST' }),
    ])
    if (!ofRes.ok && !flRes.ok) {
      // No connections or both failed — still refresh
    }
  }

  async function handleQuickSync() {
    if (!hasFanPlatformsConnected) {
      onSyncStatus?.('Connect OnlyFans or Fansly in Settings to sync.')
      return
    }
    setSyncBusy(true)
    onSyncStatus?.('Syncing subscribers and stats from connected platforms…')
    try {
      await quickPlatformSync()
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
      await quickPlatformSync()
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
      onSyncStatus?.('Switch the fan list to “From database” first, then run this again.')
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
        <div className="relative w-full sm:w-auto min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fans..."
            className="w-full bg-input pl-9 sm:w-64 min-h-[44px] sm:min-h-0"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1.5 min-h-[44px] sm:min-h-9"
                disabled={syncBusy || loadingLive}
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
                  AI thread snapshots for all fans in CRM — use “From database” view
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 min-h-[44px] sm:min-h-0">
                <Filter className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate max-w-[140px]">
                  {filter === 'database'
                    ? 'From database'
                    : filter === 'expiring'
                      ? 'Expiring soon (CRM)'
                      : filter === 'active'
                        ? 'Live: Active'
                        : filter === 'expired'
                          ? 'Live: Expired'
                          : filter === 'latest'
                            ? 'Live: Latest'
                            : filter === 'top'
                              ? 'Live: Top'
                              : 'Filter'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onFilterChange?.('database')}>
                From database
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange?.('expiring')}>
                Expiring soon (CRM, 14 days)
              </DropdownMenuItem>
              {(hasOnlyFansConnected || hasFanslyConnected) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onFilterChange?.('active')}>
                    Live: Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFilterChange?.('expired')}>
                    Live: Expired
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFilterChange?.('latest')}>
                    Live: Latest
                    <span className="block text-xs text-muted-foreground">
                      OnlyFans: newest subscribers; Fansly: active list (API)
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFilterChange?.('top')}>
                    Live: Top spenders
                    <span className="block text-xs text-muted-foreground">
                      OnlyFans: by spend; Fansly: active list (API)
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
