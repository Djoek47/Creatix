'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown, Trophy } from 'lucide-react'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { cn } from '@/lib/utils'
import { labelForCreditReason } from '@/lib/billing/credit-reason-label'
import { CreditAllocationPlanner } from '@/components/billing/credit-allocation-planner'
import { CreditAutoTopupSettings } from '@/components/billing/credit-auto-topup-settings'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type CreditTimelineRow = {
  id: string
  kind: 'debit' | 'credit' | 'expire_adjustment'
  amount: number
  reason_code: string
  created_at: string
}

type Wallet = {
  includedRemaining: number
  purchasedRemaining: number
  totalRemaining: number
}

type AutoTopupSettings = {
  enabled: boolean
  threshold_credits: number
  pack_id: string
  monthly_max_usd_cents: number
  cooldown_minutes: number
  monthly_spent_usd_cents: number
  monthly_window_start: string
  last_attempt_at: string | null
  last_success_at: string | null
  last_payment_intent_id: string | null
  last_error: string | null
  status: string
  consecutive_failures: number
}

type UsageDashboard = {
  wallet: Wallet
  aiCreditsUsed: number
  aiCreditsLimitEffective: number
  autoTopupSettings: AutoTopupSettings
  stripe: {
    hasDefaultPaymentMethod: boolean
    stripeCustomerId: string | null
    lastReceiptUrl: string | null
  }
  flags: { creditAutoTopupServerEnabled: boolean }
}

type CreditInsightPeriod = 'week' | 'month'

type InsightPeriodMeta = {
  mode: CreditInsightPeriod
  startsAt: string
  endsAt: string
  totalDebitCredits: number
}

const USAGE_SURFACE = cn(
  'gap-0 rounded-[28px] border py-0 shadow-none backdrop-blur-2xl',
  'border-black/[0.06] bg-background/75',
  'dark:border-white/[0.07] dark:bg-zinc-950/42',
)

/** Usage & credits: soft teal/violet ambience — purposeful color without noise */
const USAGE_SUMMARY_SURFACE = cn(
  USAGE_SURFACE,
  'relative overflow-hidden',
  'border-teal-900/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]',
  'dark:border-teal-200/[0.09] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_40px_100px_-60px_rgba(45,212,191,0.10)]',
)

const USAGE_HEADER_PRIMARY = 'space-y-2 px-8 pb-2 pt-12 sm:px-10 sm:pt-14'
const USAGE_HEADER_LEDGER = 'space-y-2 px-8 pb-6 pt-12 sm:px-10 sm:pt-14'

const USAGE_CARD_TITLE = cn(
  'font-sans text-[1.3125rem] font-semibold tracking-[-0.024em] text-foreground',
  'leading-[1.15] sm:text-[1.4375rem]',
)
const USAGE_CARD_DESC = 'max-w-lg font-sans text-[0.9375rem] leading-[1.58] text-muted-foreground'

const USAGE_CONTENT_LOOSE = 'space-y-10 px-8 pb-10 pt-8 sm:px-10 sm:pb-11 sm:pt-10'

/** Inset ledger / insight wells — calm, readable, low chrome. */
const USAGE_INSIGHT = cn(
  'rounded-[22px] border border-border/35 bg-muted/[0.04] px-5 py-6',
  'dark:border-white/[0.045] dark:bg-white/[0.02]',
)

function formatLedgerKind(kind: CreditTimelineRow['kind']): string {
  switch (kind) {
    case 'debit':
      return 'Debit'
    case 'credit':
      return 'Credit'
    case 'expire_adjustment':
      return 'Cycle'
    default:
      return kind
  }
}

function formatSpendPeriodCaption(meta: InsightPeriodMeta | null, period: CreditInsightPeriod): string {
  if (!meta?.startsAt) {
    return period === 'week' ? 'Trailing 7 days' : 'Calendar month to date'
  }
  const start = new Date(meta.startsAt)
  const end = new Date(meta.endsAt)
  if (period === 'week') {
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { weekday: undefined, month: 'short', day: 'numeric' })}`
  }
  return `${start.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function leaderboardRankAccent(rank: number): string {
  switch (rank) {
    case 1:
      return 'border border-amber-500/35 bg-gradient-to-br from-amber-500/18 to-amber-600/08 text-amber-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] dark:from-amber-400/[0.17] dark:to-amber-700/10 dark:text-amber-100'
    case 2:
      return 'border border-slate-400/35 bg-gradient-to-br from-slate-300/25 to-slate-500/14 text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] dark:from-white/[0.12] dark:to-slate-500/12 dark:text-slate-100'
    case 3:
      return 'border border-orange-700/30 bg-gradient-to-br from-orange-700/28 to-orange-900/14 text-orange-50 dark:border-orange-500/35 dark:from-orange-900/35 dark:to-orange-950/25'
    default:
      return 'border border-border/40 bg-muted/[0.3] text-muted-foreground dark:border-white/[0.08]'
  }
}

function UsageCreditsPanelSkeleton() {
  const block = (
    cls: string,
    key?: string,
  ): ReactNode => <div key={key} className={cn('rounded-lg bg-muted/30', cls)} aria-hidden />

  return (
    <div className="space-y-10 pt-2" role="status" aria-label="Loading credits">
      {[0, 1, 2].map((i) => (
        <div key={i} className={cn(USAGE_SURFACE, 'overflow-hidden')}>
          <div className="space-y-3 px-8 pb-12 pt-12 animate-pulse sm:px-10 sm:pb-14 sm:pt-14">
            {block('h-6 w-[40%]', 't')}
            {block('h-[15px] w-[72%]', 's')}
            <div className="mt-10 space-y-3">
              {block('h-4 w-24')}
              {block('h-14 w-[55%]', 'n')}
              {block('h-11 w-full max-w-xl rounded-xl')}
              {block('mt-10 h-[3px] w-full rounded-full')}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LedgerInsightsSkeleton() {
  const blockThin = (cls: string) => (
    <div className={cn('h-2.5 rounded-full bg-muted/35', cls)} aria-hidden />
  )
  return (
    <div className="grid gap-12 sm:grid-cols-2 sm:gap-14" aria-hidden role="presentation">
      <div className="animate-pulse space-y-6">
        {blockThin('mb-8 w-[min(220px,100%)]')}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 pb-4">
            <div className="h-3 max-w-[12rem] flex-1 rounded bg-muted/35" />
            <div className="h-3 w-12 rounded bg-muted/25" />
          </div>
        ))}
      </div>
      <div className="animate-pulse space-y-6">
        {blockThin('mb-8 w-[min(180px,100%)]')}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-[18px] bg-muted/[0.2]" />
        ))}
      </div>
    </div>
  )
}

/** Shell: stable hook count before any loading guard; heavy UI + ledger hooks live in `UsageCreditsPanelBody`. */
export function UsageCreditsPanel() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<UsageDashboard | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/usage-dashboard', { credentials: 'include' })
      if (!res.ok) {
        throw new Error('Could not load usage')
      }
      const json = (await res.json()) as UsageDashboard
      setData(json)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || !data) {
    return <UsageCreditsPanelSkeleton />
  }

  return <UsageCreditsPanelBody data={data} onDashboardSaved={load} />
}

function UsageCreditsPanelBody({
  data,
  onDashboardSaved,
}: {
  data: UsageDashboard
  onDashboardSaved: () => void | Promise<void>
}) {
  const [creditTopCategories, setCreditTopCategories] = useState<
    Array<{ reasonKey?: string; reason: string; amount: number }>
  >([])
  const [creditTimeline, setCreditTimeline] = useState<CreditTimelineRow[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [activityPeriod, setActivityPeriod] = useState<CreditInsightPeriod>('month')
  const [periodMeta, setPeriodMeta] = useState<InsightPeriodMeta | null>(null)

  const refreshInsights = useCallback(async () => {
    const period = activityPeriod
    setLedgerLoading(true)
    try {
      const ledgerRes = await fetch(`/api/billing/credit-usage-insights?period=${period}`, {
        credentials: 'include',
      })
      if (ledgerRes.ok) {
        const lj = (await ledgerRes.json()) as {
          period?: InsightPeriodMeta
          topDebits?: Array<{ reasonKey?: string; reason: string; amount: number }>
          recent?: CreditTimelineRow[]
        }
        setPeriodMeta(lj.period ?? null)
        setCreditTopCategories(lj.topDebits ?? [])
        setCreditTimeline(lj.recent ?? [])
      } else {
        setPeriodMeta(null)
        setCreditTopCategories([])
        setCreditTimeline([])
      }
    } catch {
      setPeriodMeta(null)
      setCreditTopCategories([])
      setCreditTimeline([])
    } finally {
      setLedgerLoading(false)
    }
  }, [activityPeriod])

  useEffect(() => {
    void refreshInsights()
  }, [data, refreshInsights])

  const autoTopupSnapshot = useMemo(
    () => ({
      autoTopupSettings: data.autoTopupSettings,
      stripe: data.stripe,
      flags: data.flags,
    }),
    [data],
  )

  const { wallet, aiCreditsUsed, aiCreditsLimitEffective } = data
  const includedPct =
    aiCreditsLimitEffective > 0
      ? Math.min(100, Math.round((aiCreditsUsed / Math.max(1, aiCreditsLimitEffective)) * 100))
      : 0
  const includedBar =
    wallet.totalRemaining > 0
      ? Math.round((wallet.includedRemaining / wallet.totalRemaining) * 1000) / 10
      : 0
  const purchasedBar = Math.max(0, 100 - includedBar)

  return (
    <div className="space-y-10 pt-1">
      <Card className={cn(USAGE_SUMMARY_SURFACE)}>
        {/* Ambient washes — blurred, secondary to typography */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[52%] -right-[18%] h-[min(380px,70vw)] w-[min(520px,95vw)] rounded-full bg-gradient-to-bl from-teal-400/[0.12] via-cyan-400/[0.05] to-transparent blur-3xl dark:from-teal-400/[0.095] dark:via-violet-500/[0.08]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[48%] -left-[22%] h-[min(320px,60vw)] w-[min(440px,90vw)] rounded-full bg-gradient-to-tr from-violet-500/[0.085] via-indigo-500/[0.04] to-transparent blur-3xl dark:via-indigo-500/[0.07]"
        />
        <CardHeader className={cn(USAGE_HEADER_PRIMARY, 'relative z-10 pb-4 sm:pb-5')}>
          <div className="flex gap-4">
            <span
              className={cn(
                'mt-[0.125rem] w-[4px] shrink-0 rounded-full bg-gradient-to-b',
                'from-teal-500/92 via-teal-400/75 to-violet-600/92',
                'shadow-[0_0_20px_-2px_rgba(45,212,191,0.35)]',
                'dark:from-teal-400/92 dark:to-violet-500/92',
              )}
              aria-hidden
            />
            <div className="min-w-0 space-y-2">
              <CardTitle className={USAGE_CARD_TITLE}>Usage &amp; credits</CardTitle>
              <CardDescription className={USAGE_CARD_DESC}>
                Included allowance plus top-ups. Top-ups stay available into the next cycle.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn(USAGE_CONTENT_LOOSE, 'relative z-10 sm:pt-9')}>
          <div className="space-y-4" {...DASHBOARD_CREDIT_SUMMARY_MARK}>
            <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-teal-900/72 dark:text-teal-300/78">
              Available
            </p>
            <p
              className={cn(
                'text-[2.85rem] font-semibold leading-[1.02] tracking-[-0.036em] tabular-nums sm:text-[3.125rem]',
                'text-neutral-950',
                'dark:bg-gradient-to-b dark:from-white dark:via-[#f8fafc] dark:to-teal-100/93 dark:bg-clip-text dark:text-transparent',
              )}
            >
              {wallet.totalRemaining.toLocaleString()}
            </p>
            <p className="text-[0.9375rem] font-normal text-muted-foreground/95">credits</p>
          </div>

          <div className="space-y-5">
            <div
              className={cn(
                'flex h-[3px] w-full overflow-hidden rounded-full',
                'bg-gradient-to-r from-teal-950/[0.08] via-zinc-400/25 to-violet-950/[0.10]',
                'shadow-[inset_0_1px_2px_rgba(15,23,42,0.15)] ring-1 ring-inset ring-white/25 dark:from-white/[0.05] dark:via-white/[0.09] dark:to-white/[0.05]',
              )}
              role="img"
              aria-label={`Balance mix: ${Math.round(includedBar)}% included, ${Math.round(purchasedBar)}% purchased`}
            >
              <div
                className="h-full bg-gradient-to-r from-teal-400/[0.95] to-teal-500/[0.88] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.36)] transition-[width] duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] dark:from-teal-400/95 dark:to-emerald-600/92"
                style={{ width: `${includedBar}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-violet-400/93 via-violet-500/[0.92] to-indigo-600/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-[width] duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] dark:from-violet-400/[0.93] dark:via-indigo-500/[0.88] dark:to-indigo-600/[0.92]"
                style={{ width: `${purchasedBar}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-8 border-t border-border/25 pt-7 text-[15px]">
              <div className="min-w-0 space-y-1.5 border-r border-transparent pr-6 sm:border-border/35 sm:pr-8">
                <p className="text-[13px] font-medium text-teal-800/92 dark:text-teal-400/88">Included</p>
                <p className="tabular-nums text-[1.0625rem] font-semibold leading-none tracking-tight text-teal-950 dark:text-neutral-50">
                  {wallet.includedRemaining.toLocaleString()}
                </p>
              </div>
              <div className="min-w-0 space-y-1.5 text-right">
                <p className="text-[13px] font-medium text-violet-800/92 dark:text-violet-300/88">Purchased</p>
                <p className="tabular-nums text-[1.0625rem] font-semibold leading-none tracking-tight text-indigo-950 dark:text-neutral-50">
                  {wallet.purchasedRemaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {aiCreditsLimitEffective > 0 ? (
            <p className="border-t border-border/25 pt-7 text-[13px] leading-relaxed text-muted-foreground">
              This billing cycle:{' '}
              <span className="tabular-nums text-foreground">{aiCreditsUsed.toLocaleString()}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="tabular-nums text-foreground">{aiCreditsLimitEffective.toLocaleString()}</span>
              <span className="text-muted-foreground"> included used</span>
              {includedPct > 0 ? (
                <span className="tabular-nums text-muted-foreground"> · {includedPct}%</span>
              ) : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className={cn(USAGE_SURFACE, 'overflow-hidden')}>
        <CardHeader
          className={cn(
            USAGE_HEADER_LEDGER,
            'relative z-10 flex flex-col gap-6 border-b border-border/25 pb-8 sm:flex-row sm:items-start sm:justify-between',
            'dark:border-white/[0.06]',
          )}
        >
          <div className="min-w-0 space-y-2">
            <CardTitle className={USAGE_CARD_TITLE}>Spend intelligence</CardTitle>
            <CardDescription className={USAGE_CARD_DESC}>
              Production-grade activity: see which products draw credits and review every ledger line — pick a timeframe
              to match how you weigh spend.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-500/90" aria-hidden />
                Tiered leaderboard for clarity
              </span>
              <Link
                href="/dashboard/credits-planner"
                className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 transition-colors hover:text-teal-600 dark:hover:text-teal-300"
              >
                Open full planner view <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:items-end">
            <ToggleGroup
              type="single"
              value={activityPeriod}
              onValueChange={(v) => {
                if (v === 'week' || v === 'month') setActivityPeriod(v)
              }}
              className="rounded-full border border-border/40 bg-muted/[0.2] p-1 dark:border-white/[0.08]"
            >
              <ToggleGroupItem
                value="week"
                className="min-w-[5.75rem] rounded-full px-4 py-2 text-[13px] data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                This week
              </ToggleGroupItem>
              <ToggleGroupItem
                value="month"
                className="min-w-[5.75rem] rounded-full px-4 py-2 text-[13px] data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                This month
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-center text-[11px] text-muted-foreground sm:text-right">
              {formatSpendPeriodCaption(periodMeta, activityPeriod)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 px-8 pb-10 sm:px-10 sm:pb-11">
          {ledgerLoading ? (
            <div className="pb-6">
              <LedgerInsightsSkeleton />
            </div>
          ) : (
            <div className="space-y-10">
              {periodMeta ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.1] via-background/70 to-transparent p-6 dark:from-teal-400/[0.08]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-teal-800/85 dark:text-teal-200/80">
                      Period spend
                    </p>
                    <p className="mt-2 text-[2rem] font-semibold tabular-nums tracking-tight text-foreground">
                      {periodMeta.totalDebitCredits.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">credits debited</p>
                  </div>
                  <div className="rounded-[22px] border border-border/35 bg-muted/[0.04] p-6 dark:bg-white/[0.02]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-muted-foreground/85">
                      Ledger lines
                    </p>
                    <p className="mt-2 text-[2rem] font-semibold tabular-nums tracking-tight">
                      {creditTimeline.length.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">visible in this window</p>
                  </div>
                  <div className="rounded-[22px] border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.1] via-background/70 to-transparent p-6 dark:from-violet-500/[0.08]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-violet-800/90 dark:text-violet-200/85">
                      Top mover
                    </p>
                    <p className="mt-2 line-clamp-2 text-[1.0625rem] font-semibold leading-snug text-foreground">
                      {creditTopCategories[0]
                        ? labelForCreditReason(creditTopCategories[0].reasonKey ?? creditTopCategories[0].reason)
                        : '—'}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">Highest debit category</p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-10 lg:gap-14 lg:grid-cols-2">
                <section className={USAGE_INSIGHT}>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                      Category leaderboard
                    </p>
                  </div>
                  {creditTopCategories.length === 0 ? (
                    <p className="text-[15px] leading-relaxed text-muted-foreground">
                      No debit activity this period yet — automation and AI tools appear here automatically.
                    </p>
                  ) : (
                    <ul className="space-y-0">
                      {creditTopCategories.map((row, i) => {
                        const rank = i + 1
                        const key = `${row.reasonKey ?? row.reason}-${rank}`
                        return (
                          <li
                            key={key}
                            className={cn(
                              'flex items-center gap-4 border-b border-border/25 py-4 first:pt-0 last:border-0 dark:border-white/[0.06]',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold tabular-nums',
                                leaderboardRankAccent(rank),
                              )}
                              aria-hidden
                            >
                              #{rank}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-medium leading-snug text-foreground">
                                {labelForCreditReason(row.reasonKey ?? row.reason)}
                              </p>
                              <p className="mt-0.5 text-[12px] text-muted-foreground">
                                {rank === 1 ? 'Primary driver of spend' : 'Ranked by credits debited'}
                              </p>
                            </div>
                            <span className="shrink-0 tabular-nums text-[1.0625rem] font-semibold text-foreground/95">
                              {row.amount.toLocaleString()}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
                <section className={cn(USAGE_INSIGHT, 'min-h-0')}>
                  <Collapsible defaultOpen={false} className="group min-w-0">
                    <CollapsibleTrigger
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl py-1 -mx-1 px-1 text-left',
                        'outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/45',
                      )}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                          Activity feed
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {creditTimeline.length === 0
                            ? 'No transactions'
                            : `${creditTimeline.length.toLocaleString()} ${creditTimeline.length === 1 ? 'entry' : 'entries'}`}
                        </p>
                      </div>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                        aria-hidden
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 min-h-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                      {creditTimeline.length === 0 ? (
                        <p className="text-[15px] leading-relaxed text-muted-foreground">
                          No transactions in this window — your ledger will populate as soon as credits move.
                        </p>
                      ) : (
                        <ul
                          className={cn(
                            'max-h-[min(70vh,28rem)] space-y-0 divide-y divide-border/20 overflow-y-auto overscroll-contain pr-1',
                            'dark:divide-white/[0.06]',
                          )}
                        >
                          {creditTimeline.map((row) => (
                            <li key={row.id} className="py-4 first:pt-0 last:pb-0">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,8.5rem)_1fr_auto] sm:items-start sm:gap-4">
                                <time
                                  className="shrink-0 text-[12px] tabular-nums leading-relaxed text-muted-foreground"
                                  dateTime={row.created_at}
                                >
                                  {new Date(row.created_at).toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </time>
                                <div className="min-w-0">
                                  <p className="text-[15px] font-medium leading-snug text-foreground">
                                    {formatLedgerKind(row.kind)}
                                    <span className="font-normal text-muted-foreground"> · </span>
                                    <span className="font-normal text-muted-foreground">
                                      {labelForCreditReason(row.reason_code)}
                                    </span>
                                  </p>
                                </div>
                                <span className="shrink-0 justify-self-start tabular-nums text-[15px] font-semibold text-foreground/90 sm:justify-self-end">
                                  −{row.amount.toLocaleString()}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </section>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={cn(USAGE_SURFACE, 'overflow-hidden')}>
        <CardHeader className={cn(USAGE_HEADER_LEDGER, 'border-b border-border/25 pb-8 dark:border-white/[0.06]')}>
          <CardTitle className={USAGE_CARD_TITLE}>Allocation planner</CardTitle>
          <CardDescription className={USAGE_CARD_DESC}>
            The same playbook that lives in Tools — surfaced here beside your real spend pattern so budgeting stays one
            click away from history.
          </CardDescription>
        </CardHeader>
        <CardContent className={cn('px-8 pb-10 pt-2 sm:px-10 sm:pb-12')}>
          <CreditAllocationPlanner embedded className="-mx-2" />
        </CardContent>
      </Card>

      <CreditAutoTopupSettings initialDashboard={autoTopupSnapshot} onSaved={() => void onDashboardSaved()} />
    </div>
  )
}
