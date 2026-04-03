'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { LayoutGrid, Loader2, Table2 } from 'lucide-react'

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
  const router = useRouter()
  const [filter, setFilter] = useState<FansFilter>(() =>
    hasOnlyFansConnected ? 'active' : 'database',
  )
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all')
  const [liveFans, setLiveFans] = useState<Fan[]>([])
  const [expiringFans, setExpiringFans] = useState<Fan[]>([])
  const [loadingLive, setLoadingLive] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkOffset, setBulkOffset] = useState(0)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery')

  const insightMap = useMemo(() => insightRowsToMap(threadInsightsBrief), [threadInsightsBrief])

  const fetchLive = useCallback(
    async (f: FansFilter) => {
      if (f === 'database' || f === 'expiring' || !hasOnlyFansConnected) return
      setLoadingLive(true)
      try {
        const res = await fetch(`/api/onlyfans/fans?filter=${f}&limit=50`)
        const data = await res.json()
        if (res.ok && Array.isArray(data.fans)) {
          setLiveFans(data.fans)
        } else {
          setLiveFans([])
        }
      } catch {
        setLiveFans([])
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

  const runBulkScan = async () => {
    if (filter !== 'database') {
      setBulkMessage('Switch to “From database” to scan synced fans in batches.')
      return
    }
    setBulkLoading(true)
    setBulkMessage(null)
    try {
      const res = await fetch('/api/divine/bulk-refresh-thread-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          batchSize: 15,
          offset: bulkOffset,
          platform: 'onlyfans',
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        processed?: number
        skipped?: number
        nextOffset?: number | null
        errors?: string[]
      }
      if (!res.ok) throw new Error(data.error || 'Bulk scan failed')
      const errPart =
        data.errors?.length && data.errors.length <= 3
          ? ` Issues: ${data.errors.join('; ')}`
          : data.errors?.length
            ? ` (${data.errors.length} errors — check server logs)`
            : ''
      setBulkMessage(
        `Refreshed ${data.processed ?? 0} threads${(data.skipped ?? 0) > 0 ? `, ${data.skipped} skipped` : ''}.${data.nextOffset != null ? ' Click again for the next batch.' : ' No more batches in this pass.'}${errPart}`,
      )
      if (data.nextOffset != null) setBulkOffset(data.nextOffset)
      else setBulkOffset(0)
      router.refresh()
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : 'Bulk scan failed')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <FansHeader
        filter={filter}
        onFilterChange={setFilter}
        hasOnlyFansConnected={hasOnlyFansConnected}
        loadingLive={loadingLive}
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={bulkLoading || !hasFanPlatformsConnected || filter !== 'database'}
            title={
              filter !== 'database'
                ? 'Switch to From database to refresh stored threads in batches'
                : 'Fetch threads from OnlyFans for the next batch of fans (slow; respects rate limits)'
            }
            onClick={() => void runBulkScan()}
          >
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Scan thread batch (classifications)
          </Button>
          {bulkOffset > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBulkOffset(0)
                setBulkMessage('Batch offset reset to start.')
              }}
            >
              Reset batch
            </Button>
          )}
        </div>
      </div>
      {bulkMessage && <p className="text-xs text-muted-foreground">{bulkMessage}</p>}
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
