'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FansTable } from '@/components/fans/fans-table'
import { FansGallery } from '@/components/fans/fans-gallery'
import { FansHeader } from '@/components/fans/fans-header'
import { FansStats } from '@/components/fans/fans-stats'
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

export type AudienceFilter = 'all' | 'whales' | 'creators' | 'fans'

interface FansPageClientProps {
  initialFans: Fan[]
  /** Thread insight rows for merging into list views; defaults to none. */
  threadInsightsBrief?: ThreadInsightBrief[]
  hasOnlyFansConnected: boolean
  hasFanPlatformsConnected: boolean
  analyticsTotalFans?: number
}

export function FansPageClient({
  initialFans,
  threadInsightsBrief = [],
  hasOnlyFansConnected,
  hasFanPlatformsConnected,
  analyticsTotalFans = 0,
}: FansPageClientProps) {
  // Prefer synced CRM rows when we have them; "Live: Active" can return [] if the partner
  // payload shape differs or the session is stale — empty live + hidden DB confused creators.
  const [filter, setFilter] = useState<FansFilter>(() => {
    if (initialFans.length > 0) return 'database'
    if (hasOnlyFansConnected) return 'active'
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

  const fetchLive = useCallback(
    async (f: FansFilter) => {
      if (f === 'database' || f === 'expiring' || !hasOnlyFansConnected) return
      setLoadingLive(true)
      setLiveFetchError(null)
      try {
        const res = await fetch(`/api/onlyfans/fans?filter=${f}&limit=50`)
        const data = (await res.json().catch(() => ({}))) as { fans?: Fan[]; error?: string }
        if (res.ok && Array.isArray(data.fans)) {
          setLiveFans(data.fans)
        } else {
          setLiveFans([])
          setLiveFetchError(data.error || `Could not load live fans (${res.status}). Try “From database” or reconnect OnlyFans.`)
        }
      } catch {
        setLiveFans([])
        setLiveFetchError('Network error loading live fans. Try “From database” or sync again.')
      } finally {
        setLoadingLive(false)
      }
    },
    [hasOnlyFansConnected],
  )

  const fetchExpiring = useCallback(async () => {
    setLoadingLive(true)
    try {
      const res = await fetch('/api/fans/expiring?days=14')
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
  }, [])

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
    if (filter === 'database') return initialFans
    if (filter === 'expiring') {
      return expiringFans.map((f) => mergeThreadInsightsIntoFan(f, insightMap))
    }
    return liveFans.map((f) => mergeThreadInsightsIntoFan(f, insightMap))
  }, [filter, initialFans, liveFans, expiringFans, insightMap])

  const fans = useMemo(() => {
    if (audienceFilter === 'all') return mergedFans
    return mergedFans.filter((f) => {
      const a = f.audience
      if (audienceFilter === 'whales') return a?.isWhaleOrVip === true
      if (audienceFilter === 'creators') return a?.isCreatorLikely === true
      if (audienceFilter === 'fans') return !(a?.isCreatorLikely ?? false)
      return true
    })
  }, [mergedFans, audienceFilter])

  const derivedTotalFans = Math.max(analyticsTotalFans || 0, mergedFans.length)
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
        hasFanPlatformsConnected={hasFanPlatformsConnected}
        loadingLive={loadingLive}
        onSyncStatus={setSyncStatusMessage}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
      <FansStats stats={stats} />
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
