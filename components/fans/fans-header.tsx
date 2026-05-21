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
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { FansFilter } from './fans-page-client'

function filterTriggerLabel(t: (key: string) => string, filter: FansFilter): string {
  switch (filter) {
    case 'database':
      return t('header.filterTrigger.database')
    case 'expiring':
      return t('header.filterTrigger.expiring')
    case 'active':
      return t('header.filterTrigger.active')
    case 'expired':
      return t('header.filterTrigger.expired')
    case 'latest':
      return t('header.filterTrigger.latest')
    case 'top':
      return t('header.filterTrigger.top')
    default:
      return t('header.filterTrigger.database')
  }
}

function filterDataSourceLine(t: (key: string) => string, filter: FansFilter): string {
  return filter === 'database' || filter === 'expiring' ? t('header.dataSource.crm') : t('header.dataSource.live')
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
  const t = useTranslations('fans')
  const router = useRouter()
  const [syncBusy, setSyncBusy] = useState(false)

  const liveEnabled = hasOnlyFansConnected || hasFanslyConnected

  async function handleQuickSync() {
    if (!hasFanPlatformsConnected) {
      onSyncStatus?.(t('header.statusConnectPlatforms'))
      return
    }
    setSyncBusy(true)
    onSyncStatus?.(t('header.statusSyncingSubscribers'))
    try {
      await postQuickFanPlatformSync()
      onSyncStatus?.(t('header.statusQuickSyncDone'))
      router.refresh()
    } catch {
      onSyncStatus?.(t('header.statusQuickSyncFailed'))
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
        onSyncStatus?.(t('header.statusOfDmHint'))
        return
      }
      onSyncStatus?.(t('header.statusStep2'))
      const chat = await runOnlyFansFullChatScan((m) => onSyncStatus?.(m))
      if (chat.error) {
        onSyncStatus?.(chat.error)
        return
      }
      if (chat.abortedRateLimit) {
        return
      }
      onSyncStatus?.(
        t('header.fullCrmDone', {
          totalSynced: chat.totalSynced,
          errorPart: chat.totalFailed ? t('header.fullCrmErrors', { count: chat.totalFailed }) : '',
        }),
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
      onSyncStatus?.(t('header.statusSwitchAllSynced'))
      return
    }
    if (!hasOnlyFansConnected) {
      onSyncStatus?.(t('header.statusConnectOfInsights'))
      return
    }
    setSyncBusy(true)
    onSyncStatus?.(t('header.statusThreadInsightsRunning'))
    try {
      const r = await runAllThreadInsightBatches((m) => onSyncStatus?.(m))
      if (r.error) {
        onSyncStatus?.(r.error)
        return
      }
      router.refresh()
    } catch {
      onSyncStatus?.(t('header.statusThreadInsightsFailed'))
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
                title={t('header.syncMenuAria')}
              >
                {syncBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden sm:inline">{t('header.syncMenuTitle')}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)]">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {t('header.syncMenuHelp')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!hasFanPlatformsConnected || syncBusy}
                onClick={() => void handleQuickSync()}
              >
                <span className="font-medium">{t('header.quickSyncTitle')}</span>
                <span className="block text-xs text-muted-foreground">{t('header.quickSyncDesc')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasFanPlatformsConnected || syncBusy}
                onClick={() => void handleFullCrmUpdate()}
              >
                <span className="font-medium">{t('header.fullCrmTitle')}</span>
                <span className="block text-xs text-muted-foreground">{t('header.fullCrmDesc')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={
                  !hasOnlyFansConnected || filter !== 'database' || syncBusy
                }
                onClick={() => void handleThreadInsightsAll()}
              >
                <span className="font-medium">{t('header.threadInsightsTitle')}</span>
                <span className="block text-xs text-muted-foreground">{t('header.threadInsightsDesc')}</span>
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
                title={t('header.filterMenuTitle')}
                aria-label={t('header.filterMenuAria', {
                  label: filterTriggerLabel(t, filter),
                  source: filterDataSourceLine(t, filter),
                })}
                type="button"
                disabled={syncBusy}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                    aria-hidden
                  >
                    {t('header.fanListKicker')}
                  </span>
                  <span className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                    {filterTriggerLabel(t, filter)}
                  </span>
                  <span className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                    {filterDataSourceLine(t, filter)}
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
                {t('header.filterSectionTable')}
              </DropdownMenuLabel>

              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) => onFilterChange?.(value as FansFilter)}
              >
                <DropdownMenuGroup className="space-y-0.5">
                  <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/90">
                    {t('header.filterSectionCrm')}
                  </div>
                  <DropdownMenuRadioItem
                    value="database"
                    disabled={syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        {t('header.allSyncedFansTitle')}
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">{t('header.allSyncedFansDesc')}</span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="expiring"
                    disabled={syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        {t('header.renewalsTitle')}
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">{t('header.renewalsDesc')}</span>
                    </span>
                  </DropdownMenuRadioItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-2 bg-border/60" />

                <DropdownMenuGroup className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 px-3 pb-1.5 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/90">
                      {t('header.liveSnapshot')}
                    </span>
                    {loadingLive ? (
                      <span className="text-[10px] font-normal text-muted-foreground">{t('header.liveUpdating')}</span>
                    ) : null}
                  </div>

                  {!liveEnabled ? (
                    <p className="px-3 pb-2 text-[12px] leading-relaxed text-muted-foreground">
                      {t('header.liveConnectPromptBefore')}{' '}
                      <Link
                        href="/dashboard/settings?tab=integrations"
                        className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                      >
                        {t('header.liveConnectLink')}
                      </Link>{' '}
                      {t('header.liveConnectPromptAfter')}
                    </p>
                  ) : null}

                  <DropdownMenuRadioItem
                    value="active"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        {t('header.activeSubsTitle')}
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">{t('header.activeSubsDesc')}</span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="expired"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        {t('header.recentlyExpiredTitle')}
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">{t('header.recentlyExpiredDesc')}</span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="latest"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        {t('header.newestFirstTitle')}
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">{t('header.newestFirstDesc')}</span>
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="top"
                    disabled={!liveEnabled || syncBusy}
                    className="cursor-pointer rounded-xl px-3 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                        {t('header.highestSpendTitle')}
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground">{t('header.highestSpendDesc')}</span>
                    </span>
                  </DropdownMenuRadioItem>
                </DropdownMenuGroup>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator className="my-2 bg-border/60" />

              <p className="px-3 pb-1.5 text-[11px] leading-relaxed text-muted-foreground">{t('header.footerHint')}</p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
