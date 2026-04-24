'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Shield, Crown, MessageCircle, Radar } from 'lucide-react'
import type { CreditPlanPriority } from '@/lib/billing/credit-planner'

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

export function CreditAllocationPlanner() {
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

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-semibold">Credit Allocation Planner</CardTitle>
        <CardDescription>
          Smart planner that scans your fan/revenue profile and builds a premium-first monthly strategy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={focusMode === 'premium' ? 'default' : 'outline'}
            onClick={() => setFocusMode('premium')}
            className={focusMode === 'premium' ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-white' : ''}
          >
            <Crown className="mr-1.5 h-4 w-4" />
            Premium focus
          </Button>
          <Button
            type="button"
            size="sm"
            variant={focusMode === 'balanced' ? 'default' : 'outline'}
            onClick={() => setFocusMode('balanced')}
          >
            Balanced focus
          </Button>
          <Badge variant="outline">Auto-detects fan count + revenue</Badge>
        </div>
        <Button
          onClick={runCreditPlanner}
          disabled={plannerLoading}
          className="bg-gradient-to-r from-amber-500 to-purple-600 text-white hover:from-amber-400 hover:to-purple-500"
        >
          {plannerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Build smart monthly plan
        </Button>
        {signals ? (
          <div className="grid gap-2 rounded-lg border border-border p-3 text-xs sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Fans scanned</p>
              <p className="font-semibold">{signals.fanCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">High-value fans</p>
              <p className="font-semibold">{signals.highValueFans.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Revenue (30d)</p>
              <p className="font-semibold">${signals.monthlyRevenueUsd.toLocaleString()}</p>
            </div>
          </div>
        ) : null}
        {plannerResult && (
          <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
              {plannerResult.insightLine}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">Monthly included (expiring)</p>
                <p className="font-semibold">{plannerResult.walletStrategy.includedCredits} credits</p>
                <p className="text-xs text-muted-foreground">
                  Planned use: {plannerResult.projectedMonthlySpend} ({plannerResult.walletStrategy.includedUtilizationPct}%)
                </p>
              </div>
              <div className="rounded-md border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">Purchased (non-expiring)</p>
                <p className="font-semibold">{plannerResult.walletStrategy.purchasedCredits} credits</p>
                <p className="text-xs text-muted-foreground">
                  Recommended draw: {plannerResult.walletStrategy.purchasedUsageRecommended} · Reserve after plan:{' '}
                  {plannerResult.walletStrategy.purchasedReserveAfterPlan}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border px-3 py-2">
                <p className="mb-1 flex items-center gap-1 text-xs font-medium">
                  <Shield className="h-3.5 w-3.5" />
                  Protection cadence
                </p>
                <p className="text-xs text-muted-foreground">
                  Leak scans: {plannerResult.recommendedScans.dmcaPerMonth}/month (~{plannerResult.recommendedScans.dmcaPerWeek}/week)
                </p>
                <p className="text-xs text-muted-foreground">
                  Reputation scans: {plannerResult.recommendedScans.reputationPerMonth}/month (~{plannerResult.recommendedScans.reputationPerWeek}/week)
                </p>
              </div>
              <div className="rounded-md border border-border px-3 py-2">
                <p className="mb-1 flex items-center gap-1 text-xs font-medium">
                  <Radar className="h-3.5 w-3.5" />
                  Demand vs capacity
                </p>
                <p className="text-xs text-muted-foreground">
                  Demand: {plannerResult.projectedMonthlyDemandCredits} · Included budget: {plannerResult.projectedMonthlySpend}
                </p>
                <p className="text-xs text-muted-foreground">
                  Purchased buffer needed: {plannerResult.projectedPurchasedDraw}
                </p>
              </div>
            </div>
            <p className="font-medium">
              Estimated included depletion: {plannerResult.estimatedDaysToDepletion} days
            </p>
            {plannerResult.allocations.map((row) => (
              <p key={row.category}>
                {row.category.replace('_', ' ')}: {row.credits} credits ({row.percent}%) · {row.estimatedActions}{' '}
                {row.category === 'dm_growth' || row.category === 'chat_support' ? (
                  <span className="text-muted-foreground">messages/turns</span>
                ) : (
                  <span className="text-muted-foreground">scans</span>
                )}
              </p>
            ))}
            {plannerResult.safeModeSuggestion ? (
              <p className="text-amber-600 dark:text-amber-400">{plannerResult.safeModeSuggestion}</p>
            ) : null}
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              Strategy rule: spend monthly included credits first each cycle, keep purchased credits as premium overflow and launch reserve.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
