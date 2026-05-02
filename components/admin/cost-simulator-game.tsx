'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  computeDailyCostScenario,
  SERPER_USD_PER_SEARCH,
  SIMULATOR_DAYS_PER_MONTH,
  type CostSimulatorInput,
} from '@/lib/admin/cost-simulator-model'
import { CREDIT_USD_VALUE } from '@/lib/billing/credit-economics'
import { REVENUE_TIERS, type BillingVariant } from '@/lib/pricing-matrix'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const FOCUS_PRESETS: { id: string; label: string; platforms: AdultBillingPlatform[] }[] = [
  { id: 'of', label: 'OnlyFans', platforms: ['onlyfans'] },
  { id: 'fl', label: 'Fansly', platforms: ['fansly'] },
  { id: 'mv', label: 'ManyVids', platforms: ['manyvids'] },
  { id: 'of_fl', label: 'OnlyFans + Fansly', platforms: ['onlyfans', 'fansly'] },
  { id: 'of_mv', label: 'OnlyFans + ManyVids', platforms: ['onlyfans', 'manyvids'] },
  { id: 'fl_mv', label: 'Fansly + ManyVids', platforms: ['fansly', 'manyvids'] },
]

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n < 1 ? 4 : 2,
  })
}

function fmtInt(n: number) {
  return n.toLocaleString()
}

export function AdminCostSimulatorGame({
  hybridBaseUsdPerCredit,
  hybridOverrideCount,
}: {
  hybridBaseUsdPerCredit: number
  hybridOverrideCount: number
}) {
  const [planKind, setPlanKind] = useState<CostSimulatorInput['planKind']>('paid')
  const [billingVariant, setBillingVariant] = useState<BillingVariant>('multi')
  const [tierIndex, setTierIndex] = useState(4)
  const [focusPresetId, setFocusPresetId] = useState('of')
  const [crewSize, setCrewSize] = useState(3)
  const [intensity, setIntensity] = useState(55)
  const [fansDaily, setFansDaily] = useState(140)
  const [reputationRunsDaily, setReputationRunsDaily] = useState(0.2)
  const [leakRunsDaily, setLeakRunsDaily] = useState(0.15)

  const focusPlatforms = useMemo((): CostSimulatorInput['focusPlatforms'] => {
    return FOCUS_PRESETS.find((p) => p.id === focusPresetId)?.platforms ?? ['onlyfans']
  }, [focusPresetId])

  const input: CostSimulatorInput = useMemo(
    () => ({
      planKind,
      billingVariant: planKind === 'trial' ? 'multi' : billingVariant,
      tierIndex: planKind === 'trial' ? 0 : tierIndex,
      focusPlatforms: planKind === 'trial' || billingVariant === 'multi' ? ['onlyfans'] : focusPlatforms,
      crewSize,
      intensity,
      fansInteractedPerUserPerDay: fansDaily,
      reputationScanRunsPerUserPerDay: reputationRunsDaily,
      leakScanRunsPerUserPerDay: leakRunsDaily,
    }),
    [
      planKind,
      billingVariant,
      tierIndex,
      focusPlatforms,
      crewSize,
      intensity,
      fansDaily,
      reputationRunsDaily,
      leakRunsDaily,
    ],
  )

  const result = useMemo(() => computeDailyCostScenario(input), [input])

  const share =
    result.dailySubscriptionUsd > 1e-6
      ? Math.min(
          100,
          Math.max(0, (result.dailyProviderCostUsd / result.dailySubscriptionUsd) * 100),
        )
      : 0

  const verdictClass =
    result.verdict === 'healthy'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
      : result.verdict === 'tight'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
        : result.verdict === 'underwater'
          ? 'border-red-500/45 bg-red-500/10 text-red-100'
          : 'border-violet-500/40 bg-violet-500/10 text-violet-100'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-semibold text-foreground">Daily burn lab</h1>
          <Badge variant="outline" className="border-primary/40 text-primary">
            Multi-service mix
          </Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          All figures are <strong className="text-foreground">per day</strong>. Subscription is prorated as monthly ÷{' '}
          {SIMULATOR_DAYS_PER_MONTH}. Provider cost stacks <strong className="text-foreground">five</strong> core LLM
          lanes, <strong className="text-foreground">fan-touch</strong> volume (mini-class tokens per fan you interact
          with), and <strong className="text-foreground">Serper</strong> searches for reputation discovery vs DMCA/leak
          scans ({fmtUsd(SERPER_USD_PER_SEARCH)} / search baseline — tune if your Serper tier differs).
        </p>
        <p className="max-w-3xl text-xs text-muted-foreground">
          Hybrid conversion context: base{' '}
          <span className="font-medium text-foreground">{fmtUsd(hybridBaseUsdPerCredit)} / credit</span> with{' '}
          <span className="font-medium text-foreground">{hybridOverrideCount}</span> feature-level overrides. Update in{' '}
          <Link href="/admin/settings" className="text-primary underline underline-offset-2 hover:no-underline">
            Settings
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="border-border bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg">Mission parameters</CardTitle>
            <CardDescription>Pick plan, crew size, and daily load.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select
                value={planKind}
                onValueChange={(v) => setPlanKind(v as CostSimulatorInput['planKind'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Divine trial ($0)</SelectItem>
                  <SelectItem value="paid">Paid (revenue tier matrix)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {planKind === 'paid' && (
              <>
                <div className="space-y-2">
                  <Label>Billing shape</Label>
                  <Select
                    value={billingVariant}
                    onValueChange={(v) => setBillingVariant(v as BillingVariant)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Focus (1–2 platforms)</SelectItem>
                      <SelectItem value="multi">Unified (all adult platforms)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Revenue band</Label>
                  <Select value={String(tierIndex)} onValueChange={(v) => setTierIndex(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REVENUE_TIERS.map((t) => (
                        <SelectItem key={t.tierIndex} value={String(t.tierIndex)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {billingVariant === 'single' && (
                  <div className="space-y-2">
                    <Label>Focus platforms</Label>
                    <Select value={focusPresetId} onValueChange={setFocusPresetId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOCUS_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Crew size (users)</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={crewSize}
                onChange={(e) => setCrewSize(Number(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Multiplies both subscription and token burn (identical profiles).
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Daily intensity</Label>
                <span className="font-mono text-xs text-muted-foreground">{intensity}%</span>
              </div>
              <Slider
                value={[intensity]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setIntensity(v[0] ?? 0)}
              />
              <p className="text-xs text-muted-foreground">
                Scales core LLM lanes and fan-touch tokens (5% floor on the bundle).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fans interacted / user / day</Label>
              <Input
                type="number"
                min={0}
                max={250000}
                value={fansDaily}
                onChange={(e) => setFansDaily(Math.max(0, Number(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">
                Each fan adds mini-model CRM/DM-style tokens, scaled by intensity × crew.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reputation scans / user / day</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.05}
                value={reputationRunsDaily}
                onChange={(e) => setReputationRunsDaily(Math.max(0, Number(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">
                Fractional runs OK (e.g. 0.14 ≈ one wide+social Serper batch per week). Each full run ≈ 58 searches.
              </p>
            </div>

            <div className="space-y-2">
              <Label>DMCA / leak scans / user / day</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.05}
                value={leakRunsDaily}
                onChange={(e) => setLeakRunsDaily(Math.max(0, Number(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">
                Protection pipeline Serper volume; each full run ≈ 52 searches (handle + title queries).
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Telemetry board</CardTitle>
              <CardDescription>Daily subscription slice vs estimated provider burn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-start justify-center gap-8 py-2">
                <div className="relative size-40 shrink-0">
                  <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      className="stroke-muted"
                      strokeWidth="10"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      className={cn(
                        'stroke-primary',
                        result.verdict === 'underwater' && 'stroke-red-400',
                        result.verdict === 'tight' && 'stroke-amber-400',
                        result.verdict === 'healthy' && 'stroke-emerald-400',
                        result.verdict === 'trial_burn' && 'stroke-violet-400',
                      )}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${share * 2.64} 264`}
                      initial={false}
                      animate={{ strokeDasharray: `${share * 2.64} 264` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Cost / sub
                    </span>
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {result.dailySubscriptionUsd < 1e-6 ? '—' : `${Math.round(share)}%`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">of daily rev</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background/80 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Expected pay-in / day
                      </p>
                      <p className="font-mono text-xl font-semibold tabular-nums">
                        {fmtUsd(result.dailySubscriptionUsd)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Workspace · {fmtUsd(result.monthlySubscriptionUsd)} / mo total
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/80 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Est. provider burn / day
                      </p>
                      <p className="font-mono text-xl font-semibold tabular-nums text-primary">
                        {fmtUsd(result.dailyProviderCostUsd)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        LLM lanes + fan touches + Serper (reputation + leak) — not live invoices.
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm',
                      verdictClass,
                    )}
                  >
                    <p className="font-medium capitalize">
                      {result.verdict.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-1 text-xs opacity-90">{result.verdictHint}</p>
                  </div>

                  {planKind === 'trial' && result.trialCreditsIncludedPerDay != null && (
                    <p className="text-xs text-muted-foreground">
                      Trial includes ~{result.trialCreditsIncludedPerDay.toFixed(1)} in-app credits / day (
                      {result.trialCreditsLimitMonthly} / mo cap). At this pace, heuristic ≈{' '}
                      {result.trialCreditsImpliedMonthly} credits / month from tokens.
                    </p>
                  )}

                  {planKind === 'paid' &&
                    result.paidMonthlyCreditsIncluded != null &&
                    result.paidCreditPoolUsd != null && (
                      <p className="text-xs text-muted-foreground">
                        Included AI credits (this workspace): ~{result.paidMonthlyCreditsIncluded.toLocaleString()}{' '}
                        / month (~{fmtUsd(result.paidCreditPoolUsd)} pool at {fmtUsd(CREDIT_USD_VALUE)} / credit —
                        20% of subscription USD × seats).
                      </p>
                    )}

                  {planKind === 'paid' && result.marginPctOfSubscription != null && (
                    <p className="text-xs text-muted-foreground">
                      Daily margin {fmtUsd(result.dailyMarginUsd)} (
                      {result.marginPctOfSubscription.toFixed(1)}% of prorated subscription).
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Service lanes (daily)</CardTitle>
              <CardDescription>
                Workspace daily total per lane (crew already multiplied where applicable).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.lanes.map((lane) => (
                <div
                  key={lane.feature}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{lane.label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {lane.kind === 'serper'
                        ? `~${fmtInt(lane.serperSearches ?? 0)} Serper searches @ ${fmtUsd(SERPER_USD_PER_SEARCH)}`
                        : `${fmtInt(lane.inputTokens)} in · ${fmtInt(lane.outputTokens)} out`}
                    </p>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-primary">
                    {fmtUsd(lane.estimatedUsd)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
