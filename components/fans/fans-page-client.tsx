'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { FansTable } from '@/components/fans/fans-table'
import { FansGallery } from '@/components/fans/fans-gallery'
import { FansHeader } from '@/components/fans/fans-header'
import { FansStats } from '@/components/fans/fans-stats'
import { Button } from '@/components/ui/button'
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
import { LayoutGrid, Table2 } from 'lucide-react'

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
  analyticsTotalFans?: number
  /** Latest Circe snapshot total_fans per platform (analytics_snapshots). */
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
  analyticsTotalFans = 0,
  snapshotFansByPlatform = {},
  snapshotFollowsByPlatform = {},
}: FansPageClientProps) {
  const searchParams = useSearchParams()

  const [platformScope, setPlatformScope] = useState<PlatformScope>('all')
  const [scopeReady, setScopeReady] = useState(false)

  useEffect(() => {
    const fromUrl = parsePlatformScope(searchParams.get('platform'))
    if (fromUrl) {
      setPlatformScope(fromUrl)
    } else {
      try {
        const stored = parsePlatformScope(window.localStorage.getItem(PLATFORM_SCOPE_STORAGE))
        if (stored) setPlatformScope(stored)
      } catch {
        /* ignore */
      }
    }
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
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [platformScope, scopeReady])

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
              'Could not load live fans. Try “From database”, reconnect the platform, or check billing.',
          )
        }
      } catch {
        setLiveFans([])
        setLiveFetchError('Network error loading live fans. Try “From database” or sync again.')
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

  const snapshotTotalForScope = useMemo(() => {
    if (platformScope === 'all') return analyticsTotalFans
    return snapshotFansByPlatform[platformScope] ?? 0
  }, [platformScope, analyticsTotalFans, snapshotFansByPlatform])

  const derivedTotalFans = Math.max(snapshotTotalForScope || 0, mergedFans.length)
  const stats = {
    totalFans: derivedTotalFans,
    whales: mergedFans.filter((f) => f.audience?.isWhaleOrVip ?? f.tier === 'whale').length,
    totalRevenue: mergedFans.reduce((sum, f) => sum + f.total_spent, 0),
    activeFans: mergedFans.filter((f) => f.tier !== 'inactive').length,
  }

  return (
    <div className="space-y-6">
      <FansHeader
        filter={filter}
        onFilterChange={setFilter}
        hasOnlyFansConnected={hasOnlyFansConnected}
        hasFanslyConnected={hasFanslyConnected}
        hasFanPlatformsConnected={hasFanPlatformsConnected}
        loadingLive={loadingLive}
        onSyncStatus={setSyncStatusMessage}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Platform</span>
          <div className="inline-flex rounded-md border border-border p-0.5">
            {(['all', 'onlyfans', 'fansly'] as const).map((scope) => (
              <Button
                key={scope}
                type="button"
                variant={platformScope === scope ? 'secondary' : 'ghost'}
                size="sm"
                className="px-3"
                onClick={() => setPlatformScope(scope)}
              >
                {scope === 'all' ? 'All' : scope === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Audience</span>
          <Select
            value={audienceFilter}
            onValueChange={(v) => setAudienceFilter(v as AudienceFilter)}
          >
            <SelectTrigger className="h-9 w-[200px]">
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
        <span className="text-xs text-muted-foreground sm:sr-only">Layout</span>
        <div className="inline-flex rounded-md border border-border p-0.5">
          <Button
            type="button"
            variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5 px-3"
            onClick={() => setViewMode('gallery')}
          >
            <LayoutGrid className="h-4 w-4" />
            Gallery
          </Button>
          <Button
            type="button"
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5 px-3"
            onClick={() => setViewMode('table')}
          >
            <Table2 className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>
      {viewMode === 'gallery' ? (
        <FansGallery
          fans={fans}
          hasFanPlatformsConnected={hasFanPlatformsConnected}
          loading={filter !== 'database' && loadingLive}
          liveFilter={filter !== 'database' && filter !== 'expiring' ? filter : undefined}
          showSubscriptionEnd={filter === 'database' || filter === 'expiring'}
        />
      ) : (
        <FansTable
          fans={fans}
          hasFanPlatformsConnected={hasFanPlatformsConnected}
          loading={filter !== 'database' && loadingLive}
          liveFilter={filter !== 'database' && filter !== 'expiring' ? filter : undefined}
          showSubscriptionEnd={filter === 'database' || filter === 'expiring'}
        />
      )}
    </div>
  )
}
