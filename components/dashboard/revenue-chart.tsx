'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsSnapshot } from '@/lib/types'

type PlatformKey = 'onlyfans' | 'fansly'

interface RevenueChartProps {
  analytics: AnalyticsSnapshot[]
  hasConnectedPlatforms?: boolean
  /** When false, OnlyFans tab is disabled (not connected). */
  connectedOnlyFans?: boolean
  /** When false, Fansly tab is disabled (not connected). */
  connectedFansly?: boolean
}

type Row = { label: string; iso: string; onlyfans: number; fansly: number }

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildChartRows(analytics: AnalyticsSnapshot[], maxDays: number): Row[] {
  const byDay = new Map<string, { onlyfans: number; fansly: number }>()
  for (const a of analytics) {
    if (!a?.date) continue
    const iso = String(a.date).slice(0, 10)
    const cur = byDay.get(iso) || { onlyfans: 0, fansly: 0 }
    const rev = Number(a.revenue) || 0
    if (a.platform === 'onlyfans') cur.onlyfans += rev
    else if (a.platform === 'fansly') cur.fansly += rev
    byDay.set(iso, cur)
  }

  const sortedIso = Array.from(byDay.keys()).sort()
  const tail = sortedIso.slice(-maxDays)

  return tail.map((iso) => {
    const v = byDay.get(iso)!
    return {
      iso,
      label: formatDayLabel(iso),
      onlyfans: v.onlyfans,
      fansly: v.fansly,
    }
  })
}

function emptyLastDays(days: number): Row[] {
  const out: Row[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    out.push({ iso, label: formatDayLabel(iso), onlyfans: 0, fansly: 0 })
  }
  return out
}

const OF_ACCENT = '#00AFF0'
const FS_ACCENT = '#1DA1F2'

function ChartTooltip({
  active,
  payload,
  platform,
}: {
  active?: boolean
  payload?: Array<{ payload: Row }>
  platform: PlatformKey
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const value = platform === 'onlyfans' ? row.onlyfans : row.fansly
  const name = platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'
  return (
    <div className="rounded-2xl border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md">
      <p className="font-medium text-foreground">{row.label}</p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">
        {name}: <span className="font-semibold text-foreground">${value.toLocaleString()}</span>
      </p>
    </div>
  )
}

export function RevenueChart({
  analytics,
  hasConnectedPlatforms = false,
  connectedOnlyFans = false,
  connectedFansly = false,
}: RevenueChartProps) {
  const [platform, setPlatform] = useState<PlatformKey>(() =>
    connectedOnlyFans ? 'onlyfans' : 'fansly',
  )

  useEffect(() => {
    if (platform === 'onlyfans' && !connectedOnlyFans && connectedFansly) setPlatform('fansly')
    if (platform === 'fansly' && !connectedFansly && connectedOnlyFans) setPlatform('onlyfans')
  }, [platform, connectedOnlyFans, connectedFansly])

  const chartRows = useMemo(() => {
    const built = buildChartRows(analytics, 14)
    if (built.length === 0 && hasConnectedPlatforms) {
      return emptyLastDays(7)
    }
    return built
  }, [analytics, hasConnectedPlatforms])

  const hasData = chartRows.length > 0
  const hasAnyRevenue = chartRows.some((d) => (d.onlyfans ?? 0) > 0 || (d.fansly ?? 0) > 0)
  const dataKey = platform === 'onlyfans' ? 'onlyfans' : 'fansly'
  const stroke = platform === 'onlyfans' ? OF_ACCENT : FS_ACCENT
  const gradientId = platform === 'onlyfans' ? 'revenueFillOf' : 'revenueFillFs'

  const maxVal = Math.max(
    1,
    ...chartRows.map((d) => (platform === 'onlyfans' ? d.onlyfans : d.fansly)),
  )
  const yDomain: [number, number] = [0, maxVal * 1.08]

  const showSwitcher = connectedOnlyFans || connectedFansly

  return (
    <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-base font-semibold tracking-tight">Revenue</CardTitle>
            <CardDescription className="text-[13px] leading-snug text-muted-foreground">
              {showSwitcher
                ? platform === 'onlyfans'
                  ? 'Estimated earnings from synced OnlyFans snapshots.'
                  : 'Estimated earnings from synced Fansly snapshots.'
                : 'Connect a platform to see earnings over time.'}
            </CardDescription>
          </div>
          {showSwitcher ? (
            <div
              className="flex shrink-0 items-center gap-0.5 rounded-full border border-border/70 bg-muted/30 p-0.5 shadow-inner"
              role="tablist"
              aria-label="Revenue platform"
            >
              <button
                type="button"
                role="tab"
                aria-selected={platform === 'onlyfans'}
                disabled={!connectedOnlyFans}
                onClick={() => connectedOnlyFans && setPlatform('onlyfans')}
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                  platform === 'onlyfans'
                    ? 'bg-background shadow-sm ring-1 ring-border/80'
                    : 'opacity-60 hover:opacity-90',
                  !connectedOnlyFans && 'cursor-not-allowed opacity-30 hover:opacity-30',
                )}
                title={connectedOnlyFans ? 'OnlyFans' : 'OnlyFans not connected'}
              >
                <Image src={ONLYFANS_LOGO_SRC} alt="" width={88} height={22} className="h-5 w-auto max-w-[5.5rem] object-contain object-left" />
                <span className="sr-only">OnlyFans</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={platform === 'fansly'}
                disabled={!connectedFansly}
                onClick={() => connectedFansly && setPlatform('fansly')}
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                  platform === 'fansly'
                    ? 'bg-background shadow-sm ring-1 ring-border/80'
                    : 'opacity-60 hover:opacity-90',
                  !connectedFansly && 'cursor-not-allowed opacity-30 hover:opacity-30',
                )}
                title={connectedFansly ? 'Fansly' : 'Fansly not connected'}
              >
                <Image src={FANSLY_LOGO_SRC} alt="" width={80} height={22} className="h-5 w-auto max-w-[5rem] object-contain object-left" />
                <span className="sr-only">Fansly</span>
              </button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasData && !hasConnectedPlatforms ? (
          <div className="flex h-[280px] flex-col items-center justify-center text-center sm:h-[300px]">
            <div className="mb-4 rounded-full bg-muted/80 p-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">No revenue data yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Connect OnlyFans or Fansly to start tracking earnings on this chart.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-[280px] w-full min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                      <stop offset="55%" stopColor={stroke} stopOpacity={0.06} />
                      <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.45}
                    strokeDasharray="4 6"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    width={40}
                    domain={yDomain}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${Math.round(v)}`}
                    dx={-4}
                  />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={<ChartTooltip platform={platform} />}
                  />
                  <Area
                    type="natural"
                    dataKey={dataKey}
                    name={platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
                    stroke={stroke}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    fillOpacity={1}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {hasConnectedPlatforms && hasData && !hasAnyRevenue ? (
              <p className="border-t border-border/50 pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                No revenue in this window yet — numbers appear as your platforms sync. Check back after the next sync.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
