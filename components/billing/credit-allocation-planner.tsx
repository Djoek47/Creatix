'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Loader2, Sparkles, Shield, Radar } from 'lucide-react'
import type { CreditPlanPriority } from '@/lib/billing/credit-planner'
import { cn } from '@/lib/utils'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const CATEGORY_LABELS: Record<CreditPlanPriority, string> = {
  dm_growth: 'DM growth',
  dmca: 'Leak protection',
  reputation: 'Reputation',
  chat_support: 'Chat support',
}

const CHART_FILLS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

type PlannerResult = {
  allocations: Array<{
    category: CreditPlanPriority
    credits: number
    percent: number
    estimatedActions: number
  }>
  projectedMonthlySpend: number
  estimatedDaysToDepletion: number
  projectedMonthlyDemandCredits: number
  projectedPurchasedDraw: number
  recommendedScans: {
    dmcaPerMonth: number
    dmcaPerWeek: number
    reputationPerMonth: number
    reputationPerWeek: number
  }
  walletStrategy: {
    includedCredits: number
    purchasedCredits: number
    totalCredits: number
    includedUtilizationPct: number
    purchasedReserveAfterPlan: number
    purchasedUsageRecommended: number
  }
  insightLine: string
  safeModeSuggestion: string | null
}

type PlannerResponse = {
  signals?: {
    fanCount: number
    highValueFans: number
    monthlyRevenueUsd: number
  }
  plan: PlannerResult
}

export type PlannerProps = {
  /** Sit inside Usage settings without wrapping Card chrome */
  embedded?: boolean
  className?: string
}

function actionUnit(category: CreditPlanPriority) {
  return category === 'dm_growth' || category === 'chat_support' ? 'messages / turns' : 'scans'
}

function PlannerAllocationChart({ rows }: { rows: PlannerResult['allocations'] }) {
  const data = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.percent - a.percent)
        .map((row) => ({
          name: CATEGORY_LABELS[row.category],
          percent: row.percent,
          credits: row.credits,
          actions: row.estimatedActions,
          category: row.category,
        })),
    [rows],
  )

  const height = Math.min(280, Math.max(160, data.length * 44))

  return (
    <div className="w-full min-w-0" role="img" aria-label="Credit allocation by category, percent of monthly included">
      <div className="min-h-[160px] w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              fontSize={11}
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              fontSize={11}
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '12px',
                boxShadow: '0 1px 2px rgb(0 0 0 / 0.04)',
              }}
              formatter={(value: number, _name, props: { payload?: (typeof data)[0] | (typeof data)[0][] }) => {
                const raw = props?.payload
                const payload = Array.isArray(raw) ? raw[0] : raw
                if (!payload) return [`${value}%`, 'Share']
                return [
                  `${value}% · ${payload.credits.toLocaleString()} credits · ~${payload.actions.toLocaleString()} ${actionUnit(payload.category)}`,
                  'Allocation',
                ]
              }}
            />
            <Bar dataKey="percent" radius={[0, 6, 6, 0]} barSize={20} maxBarSize={24}>
              {data.map((_, i) => (
                <Cell key={`c-${i}`} fill={CHART_FILLS[i % CHART_FILLS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function CreditAllocationPlanner({ embedded = false, className }: PlannerProps = {}) {
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null)
  const [focusMode, setFocusMode] = useState<'balanced' | 'premium'>('premium')
  const [signals, setSignals] = useState<PlannerResponse['signals'] | null>(null)

  const runCreditPlanner = async () => {
    setPlannerLoading(true)
    try {
      const res = await fetch('/api/billing/credit-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusMode }),
      })
      const data = (await res.json()) as PlannerResponse
      if (res.ok) {
        setPlannerResult(data.plan)
        setSignals(data.signals ?? null)
      }
    } finally {
      setPlannerLoading(false)
    }
  }

  const body = (
    <div className="space-y-8">
      <div className="space-y-3">
        <Label id="credit-planner-focus-label" className="text-xs font-medium tracking-wide text-muted-foreground">
          Focus
        </Label>
        <div
          className="flex w-full max-w-md rounded-xl border border-border/60 bg-muted/20 p-1"
          role="group"
          aria-labelledby="credit-planner-focus-label"
        >
          <button
            type="button"
            aria-pressed={focusMode === 'premium'}
            disabled={plannerLoading}
            onClick={() => setFocusMode('premium')}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-[color,box-shadow,background]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              focusMode === 'premium'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Premium-first
          </button>
          <button
            type="button"
            aria-pressed={focusMode === 'balanced'}
            disabled={plannerLoading}
            onClick={() => setFocusMode('balanced')}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-[color,box-shadow,background]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              focusMode === 'balanced'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Balanced
          </button>
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Premium-first weights protection and reputation a little higher. Balanced spreads credits more evenly across
          growth and support.
        </p>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          onClick={runCreditPlanner}
          disabled={plannerLoading}
          size="lg"
          className="h-11 min-w-[200px] rounded-xl px-8"
          aria-busy={plannerLoading}
        >
          {plannerLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="mr-2 h-4 w-4 opacity-80" aria-hidden />
          )}
          Generate monthly plan
        </Button>
        <p className="text-xs text-muted-foreground/90">Uses live workspace signals when available. Safe to re-run anytime.</p>
      </div>

      {signals ? (
        <section className="space-y-3" aria-label="Workspace signals">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-medium text-foreground">Workspace signals</h3>
            <span className="text-xs text-muted-foreground">This run</span>
          </div>
          <div className="grid gap-4 rounded-2xl border border-border/50 bg-muted/10 px-5 py-5 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fans</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{signals.fanCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">In scope for planning</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">High-value</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{signals.highValueFans.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Fans above threshold</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue (30d)</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">${signals.monthlyRevenueUsd.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Approximate</p>
            </div>
          </div>
        </section>
      ) : null}

      {plannerResult ? (
        <div className="space-y-10 rounded-2xl border border-border/50 bg-muted/[0.03] p-6 sm:p-8">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Summary</h3>
            <p className="max-w-2xl text-[15px] leading-relaxed text-foreground/90">{plannerResult.insightLine}</p>
          </section>

          <Separator className="bg-border/60" />

          <section className="space-y-4" aria-label="Wallet and utilization">
            <h3 className="text-sm font-medium text-foreground">Wallet</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Included (monthly)</p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {plannerResult.walletStrategy.includedCredits.toLocaleString()}
                  <span className="ml-1.5 text-base font-normal text-muted-foreground">credits</span>
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Planned use this cycle</span>
                    <span className="tabular-nums text-foreground">
                      {plannerResult.projectedMonthlySpend.toLocaleString()} ({plannerResult.walletStrategy.includedUtilizationPct}%)
                    </span>
                  </div>
                  <Progress value={Math.min(100, plannerResult.walletStrategy.includedUtilizationPct)} className="h-1.5 bg-muted" />
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Purchased (reserve)</p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {plannerResult.walletStrategy.purchasedCredits.toLocaleString()}
                  <span className="ml-1.5 text-base font-normal text-muted-foreground">credits</span>
                </p>
                <dl className="grid gap-2 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <dt>Recommended draw</dt>
                    <dd className="tabular-nums text-foreground">{plannerResult.walletStrategy.purchasedUsageRecommended}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Reserve after plan</dt>
                    <dd className="tabular-nums text-foreground">{plannerResult.walletStrategy.purchasedReserveAfterPlan}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-border/30 pt-2">
                    <dt>Total wallet</dt>
                    <dd className="tabular-nums font-medium text-foreground">{plannerResult.walletStrategy.totalCredits.toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <Separator className="bg-border/60" />

          <section className="space-y-4" aria-label="Projected monthly credit split">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="text-sm font-medium text-foreground">Monthly split</h3>
              <p className="text-xs text-muted-foreground">Share of included credits by category</p>
            </div>
            <PlannerAllocationChart rows={plannerResult.allocations} />
            <ul className="divide-y divide-border/40 rounded-xl border border-border/40 bg-background/30">
              {[...plannerResult.allocations]
                .sort((a, b) => b.percent - a.percent)
                .map((row) => (
                  <li key={row.category} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-foreground">{CATEGORY_LABELS[row.category]}</span>
                    <span className="tabular-nums text-muted-foreground">
                      <span className="font-medium text-foreground">{row.credits.toLocaleString()}</span>
                      {' · '}
                      {row.percent}%
                      {' · ~'}
                      {row.estimatedActions.toLocaleString()} {actionUnit(row.category)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          <Separator className="bg-border/60" />

          <section className="grid gap-6 sm:grid-cols-2" aria-label="Cadence and demand">
            <div className="space-y-3 rounded-xl border border-border/40 bg-background/30 px-5 py-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Shield className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Protection cadence
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Leak scans</dt>
                  <dd className="tabular-nums text-right text-foreground">
                    {plannerResult.recommendedScans.dmcaPerMonth}/mo · ~{plannerResult.recommendedScans.dmcaPerWeek}/wk
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Reputation</dt>
                  <dd className="tabular-nums text-right text-foreground">
                    {plannerResult.recommendedScans.reputationPerMonth}/mo · ~{plannerResult.recommendedScans.reputationPerWeek}/wk
                  </dd>
                </div>
              </dl>
            </div>
            <div className="space-y-3 rounded-xl border border-border/40 bg-background/30 px-5 py-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Radar className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Demand vs plan
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Projected demand</dt>
                  <dd className="tabular-nums text-foreground">{plannerResult.projectedMonthlyDemandCredits.toLocaleString()} credits</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Included in plan</dt>
                  <dd className="tabular-nums text-foreground">{plannerResult.projectedMonthlySpend.toLocaleString()} credits</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Purchased buffer</dt>
                  <dd className="tabular-nums text-foreground">{plannerResult.projectedPurchasedDraw.toLocaleString()} credits</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-border/30 bg-muted/10 px-5 py-4" aria-label="Included credit pace">
            <p className="text-sm text-foreground">
              At this pace, included credits run about{' '}
              <span className="font-semibold tabular-nums">{plannerResult.estimatedDaysToDepletion}</span> days before the cycle
              resets—assuming you follow the split above.
            </p>
            <p className="text-xs text-muted-foreground">Figures are projections, not a guarantee. Adjust as your volume changes.</p>
          </section>

          {plannerResult.safeModeSuggestion ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/[0.08] dark:text-amber-100">
              {plannerResult.safeModeSuggestion}
            </p>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Rule of thumb: use expiring included credits first each cycle; keep purchased credits for overflow and launches.
          </p>

          <p className="text-xs text-muted-foreground/80">Re-run when fans or revenue shift meaningfully—the model stays calmer with fresher signal.</p>
        </div>
      ) : null}
    </div>
  )

  if (embedded) {
    return <div className={cn('space-y-8', className)}>{body}</div>
  }

  return (
    <Card className={cn('overflow-hidden rounded-2xl border-border/60 bg-card shadow-none', className)}>
      <CardHeader className="space-y-2 px-6 pb-2 pt-8 sm:px-8">
        <CardTitle className="text-xl font-semibold tracking-tight">Credit Allocation Planner</CardTitle>
        <CardDescription className="max-w-xl text-[15px] leading-relaxed">
          A quiet read on your wallet and workspace signal—then a suggested split for the month ahead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-6 pb-8 sm:px-8">{body}</CardContent>
    </Card>
  )
}
