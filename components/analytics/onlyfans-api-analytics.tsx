'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { LucideIcon } from 'lucide-react'
import {
  Loader2,
  BarChart3,
  RefreshCw,
  Sparkles,
  TrendingUp,
  LineChart,
  PieChart,
  Wallet,
  Telescope,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

type BlockState = {
  loading: boolean
  error?: string
  data?: unknown
}

function isLikelyWarmingUpError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('forecast metric') ||
    m.includes('metric is required') ||
    m.includes('required') ||
    m.includes('not enough') ||
    m.includes('insufficient') ||
    m.includes('no data') ||
    m.includes('empty') ||
    m.includes('populate')
  )
}

async function postJson(url: string, body: object): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error?: unknown }).error)
        : null) || res.statusText
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return data
}

function JsonPeek({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false)
  const text =
    data == null
      ? '—'
      : typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        Raw response
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[10px] leading-snug whitespace-pre-wrap break-all">
          {text}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

function BlockCard({
  title,
  description,
  icon: Icon,
  state,
}: {
  title: string
  description: string
  icon: LucideIcon
  state: BlockState
}) {
  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm transition hover:border-circe/25">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 rounded-md bg-circe/10 p-1.5 text-circe">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
            <CardDescription className="text-[11px] leading-snug">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs">
        {state.loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Calling OnlyFans partner analytics…</span>
          </div>
        ) : state.error ? (
          <div className="space-y-2 py-1">
            <p className="text-[11px] text-destructive leading-snug">{state.error}</p>
            {isLikelyWarmingUpError(state.error) ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-amber-500/40 pl-2">
                Partner financial analytics usually need enough history before they return full charts and forecasts. New or
                freshly linked accounts can take up to about three months to populate every metric. Your Circe snapshots
                and charts below still reflect data we sync from your dashboard.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <JsonPeek data={state.data} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function OnlyFansApiAnalytics() {
  const rangeEnd = new Date()
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - 30)
  const start = isoDate(rangeStart)
  const end = isoDate(rangeEnd)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [earnings, setEarnings] = useState<BlockState>({ loading: true })
  const [historical, setHistorical] = useState<BlockState>({ loading: true })
  const [comparison, setComparison] = useState<BlockState>({ loading: true })
  const [txSum, setTxSum] = useState<BlockState>({ loading: true })
  const [txByType, setTxByType] = useState<BlockState>({ loading: true })
  const [forecast, setForecast] = useState<BlockState>({ loading: true })
  const [profit, setProfit] = useState<BlockState>({ loading: true })
  const [profitHist, setProfitHist] = useState<BlockState>({ loading: true })

  const run = useCallback(async () => {
    setEarnings({ loading: true })
    setHistorical({ loading: true })
    setComparison({ loading: true })
    setTxSum({ loading: true })
    setTxByType({ loading: true })
    setForecast({ loading: true })
    setProfit({ loading: true })
    setProfitHist({ loading: true })

    const safe = async (setter: (s: BlockState) => void, fn: () => Promise<unknown>) => {
      try {
        const data = await fn()
        setter({ loading: false, data })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        setter({ loading: false, error: msg })
      }
    }

    void safe(setEarnings, () => postJson('/api/onlyfans/analytics/earnings', { start_date: start, end_date: end }))
    void safe(setHistorical, () => postJson('/api/onlyfans/analytics/historical', { time_range: '3m' }))
    void safe(setComparison, () => postJson('/api/onlyfans/analytics/comparison', { start_date: start, end_date: end }))
    void safe(setTxSum, () =>
      postJson('/api/onlyfans/analytics/financial/transactions-summary', { start_date: start, end_date: end }),
    )
    void safe(setTxByType, () =>
      postJson('/api/onlyfans/analytics/financial/transactions-by-type', { start_date: start, end_date: end }),
    )
    void safe(setForecast, () => postJson('/api/onlyfans/analytics/financial/forecast', { horizon_months: 3 }))
    void safe(setProfit, () => postJson('/api/onlyfans/analytics/financial/profitability', { year, month }))

    try {
      const res = await fetch(`/api/onlyfans/analytics/financial/profitability-history?months=12`)
      const data = await res.json()
      if (!res.ok) throw new Error((data && data.error) || res.statusText)
      setProfitHist({ loading: false, data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setProfitHist({ loading: false, error: msg })
    }
  }, [start, end, year, month])

  useEffect(() => {
    void run()
  }, [run])

  const blocks = [earnings, historical, comparison, txSum, txByType, forecast, profit, profitHist]
  const allComplete = blocks.every((b) => !b.loading)
  const allFailed = allComplete && blocks.length > 0 && blocks.every((b) => b.error)
  const anyOk = blocks.some((b) => !b.loading && !b.error && b.data != null)

  return (
    <section className="space-y-5 min-w-0">
      <div className="relative overflow-hidden rounded-2xl border border-circe/20 bg-gradient-to-br from-circe/5 via-background to-violet-500/5 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-circe/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-circe">
              <Sparkles className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest">Live partner intel</span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight flex flex-wrap items-center gap-2">
              <BarChart3 className="h-6 w-6 text-circe shrink-0" />
              OnlyFans API analytics
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deep metrics from our OnlyFans data partner: earnings shape, historical curves, transaction mix, forecasts,
              and profitability. Each card loads independently so one missing metric does not block the rest.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-circe/30"
            onClick={() => void run()}
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>

      {allFailed && !anyOk ? (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <Telescope className="h-4 w-4" />
          <AlertTitle>Analytics are still warming up</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            We could not load partner analytics yet. That often happens when the account is new, was recently connected,
            or the partner dashboard still needs more history — sometimes up to about three months before every view is
            available. Your synced snapshots and charts in the sections below still show what Circe already knows. Try
            Refresh after your next sync from Settings → Integrations.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <BlockCard
          title="Earnings overview"
          description="Revenue composition for the last 30 days."
          icon={Wallet}
          state={earnings}
        />
        <BlockCard
          title="Historical performance"
          description="Trend context (e.g. 3m) from the partner."
          icon={LineChart}
          state={historical}
        />
        <BlockCard
          title="Period comparison"
          description="Compare this window to a prior period."
          icon={BarChart3}
          state={comparison}
        />
        <BlockCard
          title="Transaction summary"
          description="Aggregated transaction outcomes."
          icon={PieChart}
          state={txSum}
        />
        <BlockCard
          title="Transactions by type"
          description="Subscriptions, tips, messages, posts, and more."
          icon={PieChart}
          state={txByType}
        />
        <BlockCard
          title="Revenue forecast"
          description="Statistical projection — needs history to stabilize."
          icon={Telescope}
          state={forecast}
        />
        <BlockCard
          title="Profitability (this month)"
          description="Margin view for the selected calendar month."
          icon={TrendingUp}
          state={profit}
        />
        <BlockCard
          title="Profitability history"
          description="Trailing months from the partner."
          icon={TrendingUp}
          state={profitHist}
        />
      </div>
    </section>
  )
}
