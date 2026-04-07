'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  TrendingUp,
  CalendarDays,
  Target,
  Shield,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const STORAGE_KEY_GOAL = 'income_predictor_goal_usd'

type CalendarMode = 'week' | 'month'
type Mode = 'maintain' | 'grow'

type IncomePredictorResponse = {
  context: {
    currentMonthlyUsdEstimate: number | null
    lastPostPublishedAt: string | null
    lastPostTitle: string | null
    postsPerWeekAvg: number
    postsLast30Days: number
    openLeakAlerts: number
    onlyFansConnected: boolean
    billingBlocked: boolean
    partnerForecastError: string | null
  }
  calendarMode: CalendarMode
  calendarBuckets: Array<{ key: string; label: string; count: number }>
  heuristics: {
    level: 'realistic' | 'ambitious' | 'unrealistic'
    message: string
    suggestedNextTierOrRange: string | null
  }
  partnerForecastRaw: unknown
  ai: {
    headline: string
    summary: string
    partnerForecastNarrative: string
    nextMonthTargetAssessment: string
    strategies: Array<{ title: string; detail: string }>
    leakAndProtection: string
    postingCadenceAdvice: string
  }
}

function RealismBadge({ level }: { level: string }) {
  const variant =
    level === 'unrealistic'
      ? 'destructive'
      : level === 'ambitious'
        ? 'secondary'
        : 'default'
  return (
    <Badge variant={variant} className="capitalize">
      {level}
    </Badge>
  )
}

export function IncomePredictorDashboard() {
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month')
  const [mode, setMode] = useState<Mode>('maintain')
  const [goalUsd, setGoalUsd] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IncomePredictorResponse | null>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_GOAL)
      if (s) setGoalUsd(s)
    } catch {
      // ignore
    }
  }, [])

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const g = goalUsd.trim() ? Number(goalUsd.replace(/,/g, '')) : null
      if (mode === 'grow' && g != null && Number.isFinite(g)) {
        try {
          localStorage.setItem(STORAGE_KEY_GOAL, String(g))
        } catch {
          // ignore
        }
      }
      const res = await fetch('/api/ai/income-predictor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarMode,
          mode,
          goalUsd: mode === 'grow' && g != null && Number.isFinite(g) && g > 0 ? g : null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((data && data.error) || res.statusText || 'Request failed')
      }
      setResult(data as IncomePredictorResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [calendarMode, mode, goalUsd])

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
          <Link href="/dashboard/analytics">
            <ArrowLeft className="h-4 w-4" />
            Analytics
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 via-background to-circe/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-circe">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">Divine + partner forecast (OnlyFans)</span>
            </div>
            <h1 className="text-xl font-semibold sm:text-2xl">Income Predictor</h1>
            <p className="text-sm text-muted-foreground max-w-prose leading-relaxed">
              Combines your synced finances, post cadence, and the OnlyFans partner statistical forecast (global partner
              analytics — not available for Fansly in this tool yet) with goal realism checks and leak-aware strategies.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-circe" />
            Plan inputs
          </CardTitle>
          <CardDescription>Calendar density, growth mode, and optional next-month target.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Calendar view</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={calendarMode === 'month' ? 'default' : 'outline'}
                size="sm"
                className={calendarMode === 'month' ? 'bg-circe text-circe-foreground' : ''}
                onClick={() => setCalendarMode('month')}
              >
                Monthly buckets
              </Button>
              <Button
                type="button"
                variant={calendarMode === 'week' ? 'default' : 'outline'}
                size="sm"
                className={calendarMode === 'week' ? 'bg-circe text-circe-foreground' : ''}
                onClick={() => setCalendarMode('week')}
              >
                Weekly buckets
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Mode</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
              className="flex flex-col gap-2 sm:flex-row sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maintain" id="maintain" />
                <Label htmlFor="maintain" className="font-normal cursor-pointer">
                  Maintain current run rate
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="grow" id="grow" />
                <Label htmlFor="grow" className="font-normal cursor-pointer">
                  Grow — set next month target ($)
                </Label>
              </div>
            </RadioGroup>
            {mode === 'grow' ? (
              <div className="max-w-xs space-y-1">
                <Label htmlFor="goal" className="text-xs">
                  Target revenue (USD)
                </Label>
                <Input
                  id="goal"
                  inputMode="decimal"
                  placeholder="e.g. 12000"
                  value={goalUsd}
                  onChange={(e) => setGoalUsd(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="bg-circe text-circe-foreground hover:bg-circe/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building forecast…
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Run income predictor (2 credits)
              </>
            )}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-6">
          <Card className="border-circe/20 bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{result.ai.headline}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">{result.ai.summary}</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-circe" />
                  Your signals
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>
                  <span className="text-foreground font-medium">Est. monthly (30d snapshots): </span>
                  {result.context.currentMonthlyUsdEstimate != null
                    ? `$${Math.round(result.context.currentMonthlyUsdEstimate).toLocaleString()}`
                    : '—'}
                </p>
                <p>
                  <span className="text-foreground font-medium">Posts / 30d: </span>
                  {result.context.postsLast30Days}
                </p>
                <p>
                  <span className="text-foreground font-medium">Avg posts / week: </span>
                  {result.context.postsPerWeekAvg.toFixed(1)}
                </p>
                <p>
                  <span className="text-foreground font-medium">Last published: </span>
                  {result.context.lastPostPublishedAt
                    ? `${new Date(result.context.lastPostPublishedAt).toLocaleString()}`
                    : '—'}
                  {result.context.lastPostTitle ? ` — ${result.context.lastPostTitle}` : ''}
                </p>
                <p>
                  <span className="text-foreground font-medium">Open leak alerts: </span>
                  {result.context.openLeakAlerts}
                </p>
                {!result.context.onlyFansConnected ? (
                  <p className="text-amber-700 dark:text-amber-400 pt-1">
                    Connect OnlyFans under{' '}
                    <Link href="/dashboard/settings?tab=integrations" className="underline underline-offset-2">
                      Settings → Integrations
                    </Link>{' '}
                    for partner forecast JSON.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-circe" />
                  Goal realism
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <RealismBadge level={result.heuristics.level} />
                  {result.heuristics.suggestedNextTierOrRange ? (
                    <span className="text-muted-foreground">
                      Next band: {result.heuristics.suggestedNextTierOrRange}
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground leading-relaxed">{result.heuristics.message}</p>
                <p className="text-muted-foreground leading-relaxed pt-1">{result.ai.nextMonthTargetAssessment}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Partner forecast — OnlyFans ({result.calendarMode === 'month' ? '3mo horizon' : '1mo horizon'})
              </CardTitle>
              <CardDescription className="text-xs">{result.ai.partnerForecastNarrative}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.context.partnerForecastError ? (
                <p className="text-xs text-destructive">{result.context.partnerForecastError}</p>
              ) : null}
              <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[10px] leading-snug whitespace-pre-wrap break-all">
                {result.partnerForecastRaw != null ? JSON.stringify(result.partnerForecastRaw, null, 2) : '—'}
              </pre>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Cadence ({result.calendarMode === 'month' ? 'Monthly' : 'Weekly'} buckets)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.calendarBuckets.map((b) => (
                  <div
                    key={b.key}
                    className={cn(
                      'rounded-lg border border-border/80 px-2 py-1.5 text-[11px]',
                      b.count > 0 ? 'bg-circe/10 border-circe/30' : 'bg-muted/20',
                    )}
                  >
                    <span className="font-medium text-foreground">{b.label}</span>
                    <span className="text-muted-foreground"> · {b.count} posts</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{result.ai.postingCadenceAdvice}</p>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-circe" />
                Strategies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.ai.strategies.map((s, i) => (
                <div key={i} className="border-l-2 border-circe/40 pl-3">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-circe" />
                Leaks & protection
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
              <p>{result.ai.leakAndProtection}</p>
              <p>
                <Link href="/dashboard/protection" className="text-circe underline-offset-4 hover:underline">
                  Open Protection / Aegis
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
