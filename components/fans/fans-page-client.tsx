'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { FansTable } from '@/components/fans/fans-table'
import { FansGallery } from '@/components/fans/fans-gallery'
import { FansHeader } from '@/components/fans/fans-header'
import { FansStats } from '@/components/fans/fans-stats'
import { FansArrangementsSection } from '@/components/fans/fans-arrangements-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Fan } from '@/lib/types'
import {
  insightRowsToMap,
  mergeThreadInsightsIntoFan,
  type ThreadInsightBrief,
} from '@/lib/fans/merge-fan-audience'
import { filterFansBySearchQuery } from '@/lib/fans/fan-search-filter'
import { postQuickFanPlatformSync } from '@/lib/fans/post-quick-fan-sync'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { LayoutGrid, Search, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FansFilter = 'database' | 'active' | 'expired' | 'latest' | 'top' | 'expiring'

export type AudienceFilter =
  | 'all'
  | 'whales'
  | 'creators'
  | 'paying_creators'
  | 'advertisements'
  | 'freeloaders'
  | 'fans'

export type PlatformScope = 'all' | 'onlyfans' | 'fansly'

const PLATFORM_SCOPE_STORAGE = 'creatix-fans-platform-scope'

function parsePlatformScope(raw: string | null): PlatformScope | null {
  if (raw === 'all' || raw === 'onlyfans' || raw === 'fansly') return raw
  return null
}

interface FansPageClientProps {
  initialFans: Fan[]
  /** Thread insight rows for merging into list views; defaults to none. */
  threadInsightsBrief?: ThreadInsightBrief[]
  hasOnlyFansConnected: boolean
  hasFanslyConnected: boolean
  hasFanPlatformsConnected: boolean
  /** Latest Circe snapshot total_fans per platform — onlyfans + fansly keys. */
  snapshotFansByPlatform?: Record<string, number>
  /** Free / non-sub follows per platform (e.g. OF free followers, Fansly followers). */
  snapshotFollowsByPlatform?: Record<string, number>
}

export function FansPageClient({
  initialFans,
  threadInsightsBrief = [],
  hasOnlyFansConnected,
  hasFanslyConnected,
  hasFanPlatformsConnected,
  snapshotFansByPlatform = {},
  snapshotFollowsByPlatform = {},
}: FansPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [platformScope, setPlatformScope] = useState<PlatformScope>('all')
  const [scopeReady, setScopeReady] = useState(false)

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return ''
    try {
      const q = new URLSearchParams(window.location.search).get('q')
      return typeof q === 'string' ? q : ''
    } catch {
      return ''
    }
  })

  const debouncedSearch = useDebouncedValue(searchQuery, 200)

  useEffect(() => {
    const platformFromUrl = parsePlatformScope(searchParams.get('platform'))
    const qFromUrl = searchParams.get('q')

    if (platformFromUrl) {
      setPlatformScope(platformFromUrl)
    } else {
      try {
        const stored = parsePlatformScope(window.localStorage.getItem(PLATFORM_SCOPE_STORAGE))
        if (stored) setPlatformScope(stored)
      } catch {
        /* ignore */
      }
    }
    if (qFromUrl !== null) setSearchQuery(qFromUrl)

    setScopeReady(true)
  }, [searchParams])

  useEffect(() => {
    if (!scopeReady) return
    try {
      window.localStorage.setItem(PLATFORM_SCOPE_STORAGE, platformScope)
    } catch {
      /* ignore */
    }
    const url = new URL(window.location.href)
    if (platformScope === 'all') {
      url.searchParams.delete('platform')
    } else {
      url.searchParams.set('platform', platformScope)
    }
    const trimmed = debouncedSearch.trim()
    if (!trimmed) {
      url.searchParams.delete('q')
    } else {
      url.searchParams.set('q', trimmed)
    }
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [platformScope, scopeReady, debouncedSearch])

  const hasLiveSource =
    (platformScope === 'all' && (hasOnlyFansConnected || hasFanslyConnected)) ||
    (platformScope === 'onlyfans' && hasOnlyFansConnected) ||
    (platformScope === 'fansly' && hasFanslyConnected)

  // Prefer synced CRM rows when we have them; "Live: Active" can return [] if the partner
  // payload shape differs or the session is stale — empty live + hidden DB confused creators.
  const [filter, setFilter] = useState<FansFilter>(() => {
    if (initialFans.length > 0) return 'database'
    if (hasOnlyFansConnected || hasFanslyConnected) return 'active'
    return 'database'
  })
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all')
  const [liveFans, setLiveFans] = useState<Fan[]>([])
  const [expiringFans, setExpiringFans] = useState<Fan[]>([])
  const [loadingLive, setLoadingLive] = useState(false)
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null)
  const [emptyQuickSyncBusy, setEmptyQuickSyncBusy] = useState(false)
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery')
  const [liveFetchError, setLiveFetchError] = useState<string | null>(null)

  const insightMap = useMemo(() => insightRowsToMap(threadInsightsBrief), [threadInsightsBrief])

  const scopedInitialFans = useMemo(() => {
    if (platformScope === 'all') return initialFans
    return initialFans.filter((f) => f.platform === platformScope)
  }, [initialFans, platformScope])

  const fetchLive = useCallback(
    async (f: FansFilter) => {
      if (f === 'database' || f === 'expiring' || !hasLiveSource) return
      setLoadingLive(true)
      setLiveFetchError(null)
      try {
        const runOf = hasOnlyFansConnected && (platformScope === 'all' || platformScope === 'onlyfans')
        const runFl = hasFanslyConnected && (platformScope === 'all' || platformScope === 'fansly')

        if (!runOf && !runFl) {
          setLiveFans([])
          setLiveFetchError('Connect OnlyFans or Fansly (or change platform scope) to load live lists.')
          return
        }

        const qs = `filter=${encodeURIComponent(f)}&limit=50`
        const promises: Promise<Response>[] = []
        if (runOf) promises.push(fetch(`/api/onlyfans/fans?${qs}`))
        if (runFl) promises.push(fetch(`/api/fansly/fans?${qs}`))

        const responses = await Promise.all(promises)
        const payloads = await Promise.all(
          responses.map((res) => res.json().catch(() => ({})) as Promise<{ fans?: Fan[]; error?: string }>),
        )

        let combined: Fan[] = []
        let err: string | undefined
        let i = 0
        if (runOf) {
          const res = responses[i]
          const data = payloads[i]
          i += 1
          if (res.ok && Array.isArray(data.fans)) combined = combined.concat(data.fans)
          else if (!res.ok) err = data.error || `OnlyFans live list failed (${res.status}).`
        }
        if (runFl) {
          const res = responses[i]
          const data = payloads[i]
          if (res.ok && Array.isArray(data.fans)) combined = combined.concat(data.fans)
          else if (!res.ok) {
            const flErr = data.error || `Fansly live list failed (${res.status}).`
            err = err ? `${err} ${flErr}` : flErr
          }
        }

        if (combined.length > 0 || !err) {
          setLiveFans(combined)
          if (err) setLiveFetchError(err)
          else setLiveFetchError(null)
        } else {
          setLiveFans([])
          setLiveFetchError(
            err ||
              'Could not load live fans. Try “All synced”, reconnect the platform, or check billing.',
          )
        }
      } catch {
        setLiveFans([])
        setLiveFetchError('Network error loading live fans. Try “All synced” or sync again.')
      } finally {
        setLoadingLive(false)
      }
    },
    [hasLiveSource, hasOnlyFansConnected, hasFanslyConnected, platformScope],
  )

  const fetchExpiring = useCallback(async () => {
    setLoadingLive(true)
    try {
      const platformQ =
        platformScope === 'all' ? '' : `&platform=${encodeURIComponent(platformScope)}`
      const res = await fetch(`/api/fans/expiring?days=14${platformQ}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.fans)) {
        setExpiringFans(data.fans as Fan[])
      } else {
        setExpiringFans([])
      }
    } catch {
      setExpiringFans([])
    } finally {
      setLoadingLive(false)
    }
  }, [platformScope])

  useEffect(() => {
    if (filter === 'expiring') {
      void fetchExpiring()
      return
    }
    if (filter !== 'database') {
      void fetchLive(filter)
    }
  }, [filter, fetchLive, fetchExpiring])

  const mergedFans = useMemo(() => {
    if (filter === 'database') return scopedInitialFans
    if (filter === 'expiring') {
      return expiringFans.map((f) => mergeThreadInsightsIntoFan(f, insightMap))
    }
    return liveFans.map((f) => mergeThreadInsightsIntoFan(f, insightMap))
  }, [filter, scopedInitialFans, liveFans, expiringFans, insightMap])

  const fans = useMemo(() => {
    if (audienceFilter === 'all') return mergedFans
    return mergedFans.filter((f) => {
      const a = f.audience
      if (audienceFilter === 'whales') return a?.isWhaleOrVip === true
      if (audienceFilter === 'creators') return a?.isCreatorLikely === true
      if (audienceFilter === 'paying_creators') {
        return Boolean(a?.badges?.some((b) => b.key === 'paying_creator'))
      }
      if (audienceFilter === 'advertisements') {
        return Boolean(a?.badges?.some((b) => b.key === 'advertisement'))
      }
      if (audienceFilter === 'freeloaders') {
        return Boolean(a?.badges?.some((b) => b.key === 'freeloader'))
      }
      if (audienceFilter === 'fans') return !(a?.isCreatorLikely ?? false)
      return true
    })
  }, [mergedFans, audienceFilter])

  const displayFans = useMemo(
    () => filterFansBySearchQuery(fans, debouncedSearch),
    [fans, debouncedSearch],
  )

  const searchMismatch =
    fans.length > 0 && displayFans.length === 0 && Boolean(debouncedSearch.trim())

  const handleEmptyQuickSync = useCallback(async () => {
    if (!hasFanPlatformsConnected) return
    setEmptyQuickSyncBusy(true)
    setSyncStatusMessage('Syncing subscribers from connected platforms…')
    try {
      await postQuickFanPlatformSync()
      router.refresh()
      setSyncStatusMessage('Quick sync finished.')
    } catch {
      setSyncStatusMessage('Quick sync failed — try again.')
    } finally {
      setEmptyQuickSyncBusy(false)
    }
  }, [hasFanPlatformsConnected, router])

  const snapshotCreatorTotal = useMemo(() => {
    if (platformScope === 'all') {
      return (snapshotFansByPlatform.onlyfans ?? 0) + (snapshotFansByPlatform.fansly ?? 0)
    }
    return snapshotFansByPlatform[platformScope] ?? 0
  }, [platformScope, snapshotFansByPlatform])

  /** Platform snapshot totals when available — avoid mixing Instagram/Twitter into this page. */
  const derivedTotalFans = snapshotCreatorTotal > 0 ? snapshotCreatorTotal : mergedFans.length
  const stats = {
    totalFans: derivedTotalFans,
    rowsInView: displayFans.length,
    whales: mergedFans.filter((f) => f.audience?.isWhaleOrVip ?? f.tier === 'whale').length,
    totalRevenue: mergedFans.reduce((sum, f) => sum + f.total_spent, 0),
    activeFans: mergedFans.filter((f) => f.tier !== 'inactive').length,
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      <FansHeader
        filter={filter}
        onFilterChange={setFilter}
        hasOnlyFansConnected={hasOnlyFansConnected}
        hasFanslyConnected={hasFanslyConnected}
        hasFanPlatformsConnected={hasFanPlatformsConnected}
        loadingLive={loadingLive}
        onSyncStatus={setSyncStatusMessage}
      />
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 rounded-xl border-border/50 bg-background/70 pl-9 pr-10 text-[15px] tracking-tight shadow-none placeholder:text-muted-foreground/70"
          placeholder="Search name or handle"
          aria-label="Search fans by name or handle"
          autoComplete="off"
        />
        {searchQuery ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="w-20 shrink-0 text-[13px] font-medium text-muted-foreground">Platform</span>
          <div
            className="inline-flex max-w-full rounded-full border border-border/45 bg-muted/[0.2] p-1 dark:bg-muted/15"
            role="group"
            aria-label="Platform scope"
          >
            {(['all', 'onlyfans', 'fansly'] as const).map((scope) => (
              <Button
                key={scope}
                type="button"
                variant={platformScope === scope ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'rounded-full px-3 shadow-none transition-colors',
                  platformScope === scope && 'bg-background/90 dark:bg-background/80',
                  scope === 'all'
                    ? 'min-h-9'
                    : 'min-h-9 min-w-[4.25rem] px-2.5 sm:min-w-[5.25rem] sm:px-3',
                )}
                onClick={() => setPlatformScope(scope)}
                title={scope === 'all' ? 'All platforms' : scope === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
              >
                {scope === 'all' ? (
                  'All'
                ) : scope === 'onlyfans' ? (
                  <Image
                    src="/onlyfans-logo.png"
                    alt="OnlyFans"
                    width={140}
                    height={40}
                    className="h-8 w-auto max-h-8 max-w-[6.5rem] object-contain object-center sm:max-w-[7.5rem]"
                    draggable={false}
                  />
                ) : (
                  <Image
                    src="/fansly-logo.png"
                    alt="Fansly"
                    width={140}
                    height={40}
                    className="h-8 w-auto max-h-8 max-w-[6.5rem] object-contain object-center sm:max-w-[7.5rem]"
                    draggable={false}
                  />
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="w-20 shrink-0 text-[13px] font-medium text-muted-foreground">Audience</span>
          <Select
            value={audienceFilter}
            onValueChange={(v) => setAudienceFilter(v as AudienceFilter)}
          >
            <SelectTrigger className="h-10 w-full min-w-[10rem] max-w-[16rem] rounded-full border-border/45 bg-background/70 shadow-none sm:w-[200px]">
              <SelectValue placeholder="Filter audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="whales">Whale / VIP</SelectItem>
              <SelectItem value="creators">Creator signal</SelectItem>
              <SelectItem value="paying_creators">Paying creator</SelectItem>
              <SelectItem value="advertisements">Advertisement</SelectItem>
              <SelectItem value="freeloaders">Freeloader</SelectItem>
              <SelectItem value="fans">Typical fans</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {syncStatusMessage && (
        <p className="text-xs text-muted-foreground">{syncStatusMessage}</p>
      )}
      {filter !== 'database' && filter !== 'expiring' && liveFetchError && !loadingLive ? (
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100/90">
          {liveFetchError}
        </p>
      ) : null}
      <FansStats
        stats={stats}
        platformScope={platformScope}
        snapshotFansByPlatform={snapshotFansByPlatform}
        snapshotFollowsByPlatform={snapshotFollowsByPlatform}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <span className="sr-only">Layout</span>
        <div className="inline-flex rounded-full border border-border/45 bg-muted/[0.2] p-1 dark:bg-muted/15">
          <Button
            type="button"
            variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5 rounded-full px-3 shadow-none transition-colors [&_svg]:text-muted-foreground"
            onClick={() => setViewMode('gallery')}
          >
            <LayoutGrid className="h-4 w-4" />
            Gallery
          </Button>
          <Button
            type="button"
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5 rounded-full px-3 shadow-none transition-colors [&_svg]:text-muted-foreground"
            onClick={() => setViewMode('table')}
          >
            <Table2 className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>
      {viewMode === 'gallery' ? (
        <FansGallery
          fans={displayFans}
          filteredCountBeforeSearch={fans.length}
          searchMismatch={searchMismatch}
          searchTerm={debouncedSearch.trim()}
          hasFanPlatformsConnected={hasFanPlatformsConnected}
          hasOnlyFansConnected={hasOnlyFansConnected}
          hasFanslyConnected={hasFanslyConnected}
          platformScope={platformScope}
          onEmptyQuickSync={handleEmptyQuickSync}
          emptyQuickSyncBusy={emptyQuickSyncBusy}
          loading={filter !== 'database' && loadingLive}
          liveFilter={filter !== 'database' && filter !== 'expiring' ? filter : undefined}
          showSubscriptionEnd={filter === 'database' || filter === 'expiring'}
        />
      ) : (
        <FansTable
          fans={displayFans}
          filteredCountBeforeSearch={fans.length}
          searchMismatch={searchMismatch}
          searchTerm={debouncedSearch.trim()}
          hasFanPlatformsConnected={hasFanPlatformsConnected}
          hasOnlyFansConnected={hasOnlyFansConnected}
          hasFanslyConnected={hasFanslyConnected}
          platformScope={platformScope}
          onEmptyQuickSync={handleEmptyQuickSync}
          emptyQuickSyncBusy={emptyQuickSyncBusy}
          loading={filter !== 'database' && loadingLive}
          liveFilter={filter !== 'database' && filter !== 'expiring' ? filter : undefined}
          showSubscriptionEnd={filter === 'database' || filter === 'expiring'}
        />
      )}
      <FansArrangementsSection
        hasOnlyFans={hasOnlyFansConnected}
        hasFansly={hasFanslyConnected}
        compact
      />
    </div>
  )
}
