'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useCreditInsufficientModal } from '@/components/billing/credit-insufficient-modal-context'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'
import { Loader2, RadioTower, BarChart3, Bell, ListTodo, ScanLine, Coins, CalendarDays, AlertCircle } from 'lucide-react'
import type { CirceChurnSettingsRow } from '@/lib/circe-churn/run-for-user'
import { AiToolMarkdownReadout } from '@/components/ai/ai-tool-markdown-readout'

const surfaceCard =
  'rounded-2xl border border-border/35 bg-card/60 shadow-none backdrop-blur-sm dark:border-border/25 dark:bg-card/45'
const insetFieldGroup =
  'rounded-2xl border border-border/25 bg-muted/[0.04] p-5 sm:p-6 dark:bg-muted/[0.07]'
const sectionKicker = 'text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75'
const sectionHeading = 'text-lg font-semibold tracking-tight text-foreground sm:text-xl'
const sectionSub = 'mt-2 max-w-prose text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]'
const blockHeading = 'text-[15px] font-semibold tracking-tight text-foreground'
const blockSub = 'mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted-foreground'
const labelClass = 'text-[13px] font-medium text-foreground/90'

export default function ChurnPredictorHubPage() {
  const { wallet, loading: creditsLoading, refresh: refreshCredits } = useCreditSnapshot()
  const { openCreditInsufficientModal } = useCreditInsufficientModal()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [runCadence, setRunCadence] = useState<'off' | 'daily' | 'weekly'>('off')
  const [runHourUtc, setRunHourUtc] = useState(9)
  const [expiringWithinDays, setExpiringWithinDays] = useState(14)
  const [staleDays, setStaleDays] = useState(10)
  const [includeStale, setIncludeStale] = useState(true)
  const [maxFans, setMaxFans] = useState(6)
  const [notifySummary, setNotifySummary] = useState(true)
  const [notifyEmpty, setNotifyEmpty] = useState(false)
  const [creditsPerRun, setCreditsPerRun] = useState(2)
  const [linkMgr, setLinkMgr] = useState(true)
  const [linkProto, setLinkProto] = useState(true)

  const [scanning, setScanning] = useState(false)

  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [digest, setDigest] = useState<string | null>(null)
  const [digestAt, setDigestAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/circe-churn/settings')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not load settings')
        return
      }
      const s = data.settings as CirceChurnSettingsRow & {
        last_digest_markdown?: string | null
        last_digest_at?: string | null
      }
      setEnabled(s.enabled)
      setRunCadence(s.run_cadence)
      setRunHourUtc(s.run_hour_utc)
      setExpiringWithinDays(s.expiring_within_days)
      setStaleDays(s.stale_interaction_days)
      setIncludeStale(s.include_stale_active)
      setMaxFans(s.max_fans_per_run)
      setNotifySummary(s.notify_on_run_summary)
      setNotifyEmpty(s.notify_when_empty)
      setCreditsPerRun(s.credits_per_run ?? 2)
      setLinkMgr(s.link_divine_manager_tasks !== false)
      setLinkProto(s.link_protocol_tasks !== false)
      setLastRunAt(s.last_run_at)
      setLastError(s.last_run_error)
      setDigest(s.last_digest_markdown ?? null)
      setDigestAt(s.last_digest_at ?? null)
    } catch {
      setError('Could not load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const res = await fetch('/api/circe-churn/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          run_cadence: runCadence,
          run_hour_utc: runHourUtc,
          expiring_within_days: expiringWithinDays,
          stale_interaction_days: staleDays,
          include_stale_active: includeStale,
          max_fans_per_run: maxFans,
          notify_on_run_summary: notifySummary,
          notify_when_empty: notifyEmpty,
          credits_per_run: creditsPerRun,
          link_divine_manager_tasks: linkMgr,
          link_protocol_tasks: linkProto,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 402) {
        const payload = data as { used?: number; limit?: number }
        const perRun = Math.min(10, Math.max(1, Math.round(Number(creditsPerRun) || 2)))
        openCreditInsufficientModal({
          requiredCredits: perRun,
          used: typeof payload.used === 'number' ? payload.used : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          contextLabel: 'Churn retention settings',
        })
        await refreshCredits()
        return
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Save failed')
        return
      }
      const s = data.settings as CirceChurnSettingsRow & { last_digest_markdown?: string | null }
      setLastRunAt(s.last_run_at)
      setLastError(s.last_run_error)
      setDigest(s.last_digest_markdown ?? null)
      setSavedAt(new Date().toLocaleTimeString())
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const runScanNow = async () => {
    setScanning(true)
    setError(null)
    try {
      const res = await fetch('/api/circe-churn/run', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 402) {
        const payload = data as { used?: number; limit?: number }
        const cost = Math.min(10, Math.max(1, Math.round(Number(creditsPerRun) || 2)))
        openCreditInsufficientModal({
          requiredCredits: cost,
          used: typeof payload.used === 'number' ? payload.used : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          contextLabel: 'Churn scan',
        })
        await refreshCredits()
        return
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Scan failed')
        return
      }
      await load()
      await refreshCredits()
    } catch {
      setError('Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i)

  const scanCreditCost = Math.min(10, Math.max(1, Math.round(Number(creditsPerRun) || 2)))
  const creditsRemaining = wallet?.totalRemaining ?? 0
  const canAffordScan = !creditsLoading && creditsRemaining >= scanCreditCost

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin opacity-80" aria-hidden />
        <p className="text-[13px] tracking-wide text-muted-foreground/90">Loading</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-16 pt-1 sm:space-y-12 sm:pb-20">
      <header className="space-y-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between sm:gap-14">
          <div className="max-w-md space-y-6">
            <p className={sectionKicker}>Retention · Credits when a run finds matches</p>
            <div className="space-y-4">
              <h1 className="text-balance font-sans text-[32px] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[36px]">
                Churn Predictor
              </h1>
              <p className="text-pretty text-[15px] leading-[1.55] text-muted-foreground sm:text-[16px]">
                Surfaces fans who may drift before they leave—one calm report with context, ideas, and draft messages.
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:items-stretch">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
              <div className="flex flex-col gap-2 sm:items-end">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 rounded-xl px-7 text-[15px] font-medium shadow-sm"
                  disabled={scanning || creditsLoading || !canAffordScan}
                  onClick={() => void runScanNow()}
                  title={
                    !canAffordScan && !creditsLoading
                      ? `Need at least ${scanCreditCost} AI credit${scanCreditCost === 1 ? '' : 's'} (you have ${creditsRemaining}). Add credits under Billing.`
                      : `Uses up to ${scanCreditCost} AI credit${scanCreditCost === 1 ? '' : 's'} when at least one fan matches your churn rules (same as “Credits per run”). Nothing debited if no one qualifies.`
                  }
                >
                  {scanning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="mr-2 h-4 w-4 opacity-90" strokeWidth={2} />
                  )}
                  Scan now
                </Button>
                <p className="flex max-w-[16rem] items-start gap-2 text-[12px] leading-snug text-muted-foreground sm:text-right">
                  <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                  <span>
                    {creditsLoading ? (
                      'Loading balance…'
                    ) : (
                      <>
                        <span className="tabular-nums font-medium text-foreground/80">{creditsRemaining}</span> left ·
                        OnlyFans + Fansly ·{' '}
                        <span className="tabular-nums font-medium text-foreground/80">{scanCreditCost}</span> if anyone
                        matches ·{' '}
                        {!canAffordScan ? (
                          <Link
                            href="/dashboard/settings?tab=billing"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            Add credits
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/85">none if empty</span>
                        )}
                      </>
                    )}
                  </span>
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-xl border-border/50 bg-background/50 px-6 text-[15px] font-medium shadow-none backdrop-blur-sm"
              >
                <Link href="/dashboard/ai-studio/tools/churn-predictor">
                  <BarChart3 className="mr-2 h-4 w-4 opacity-70" strokeWidth={2} />
                  One fan
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className={cn(
            'flex gap-4 rounded-2xl border border-border/40 bg-muted/[0.15] px-5 py-4 backdrop-blur-[2px]',
            'dark:border-white/[0.08] dark:bg-white/[0.04]',
          )}
        >
          <span
            className="mt-0.5 flex h-[2.875rem] w-[3px] shrink-0 rounded-full bg-gradient-to-b from-amber-500/90 to-amber-600/70 dark:from-amber-400/75 dark:to-amber-500/55"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 gap-3">
            <AlertCircle
              className="mt-[1px] h-[17px] w-[17px] shrink-0 text-amber-600/85 dark:text-amber-400/70"
              strokeWidth={1.85}
              aria-hidden
            />
            <p className="min-w-0 text-[14px] leading-[1.55] tracking-[-0.015em] text-foreground/[0.92]">{error}</p>
          </div>
        </div>
      ) : null}

      <Card className={cn(surfaceCard, 'overflow-hidden')}>
        <CardContent className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-muted/[0.08]">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-[14px] font-semibold text-foreground">Upcoming drops for scans</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Edit your content calendar on its own page so churn scans can reference what you actually plan to post.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="h-10 shrink-0 rounded-xl px-4">
            <Link href="/dashboard/retention/tease">User retention by tease</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className={cn(surfaceCard, 'overflow-hidden')}>
        <CardHeader className="space-y-0 border-b border-border/25 px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-row items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-muted/[0.08]">
              <RadioTower className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="font-sans text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Automatic scans
                </CardTitle>
                <Switch
                  checked={enabled}
                  disabled={creditsLoading}
                  onCheckedChange={(v) => {
                    if (v && !canAffordScan) {
                      setError(
                        `Add at least ${scanCreditCost} AI credit${scanCreditCost === 1 ? '' : 's'} before enabling automatic scans (you have ${creditsRemaining}). Open Billing to top up.`,
                      )
                      return
                    }
                    setEnabled(v)
                  }}
                  aria-label="Automatic churn scans enabled"
                  className="mt-0.5 shrink-0 data-[state=checked]:shadow-sm"
                />
              </div>
              <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
                Matches your churn rules against OnlyFans &amp; Fansly CRM fans. Charges{' '}
                <span className="font-medium tabular-nums text-foreground/90">up to {creditsPerRun}</span>{' '}
                credit{creditsPerRun === 1 ? '' : 's'} only when the batch finds qualifiers—same cap as Scan now.
                Scheduled runs respect <span className="text-foreground/85">Fans per run</span> below; Scan now can review
                broader lists.
              </p>
              {!creditsLoading && !canAffordScan ? (
                <div
                  className={cn(
                    'rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 text-[13px] leading-snug text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/[0.07] dark:text-amber-100/95',
                  )}
                  role="status"
                >
                  <span className="tabular-nums font-medium">{creditsRemaining}</span> credits available — need{' '}
                  <span className="tabular-nums font-semibold">{scanCreditCost}</span> per run.{' '}
                  <Link href="/dashboard/settings?tab=billing" className="font-medium underline underline-offset-2">
                    Billing
                  </Link>
                  {' · '}
                  or lower Credits per match in Configuration.
                </div>
              ) : !creditsLoading ? (
                <p className="text-[12px] tabular-nums text-muted-foreground/85">
                  Balance{' '}
                  <span className="font-medium text-foreground/90">{creditsRemaining}</span>
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-6 pb-7 pt-6 sm:px-8">
          <div className={insetFieldGroup}>
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">Recurrence</p>
                <p className="mt-1 text-[12px] text-muted-foreground/88">Off defers to manual Scan only.</p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="space-y-2">
                <Label htmlFor="churn-cadence-auto" className={labelClass}>
                  Frequency
                </Label>
                <Select value={runCadence} onValueChange={(v) => setRunCadence(v as 'off' | 'daily' | 'weekly')}>
                  <SelectTrigger id="churn-cadence-auto" className="h-11 rounded-xl border-border/40 bg-background/60 text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off — manual only</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="churn-hour-auto" className={labelClass}>
                  Hour (UTC)
                </Label>
                <Select value={String(runHourUtc)} onValueChange={(v) => setRunHourUtc(Number.parseInt(v, 10))}>
                  <SelectTrigger
                    id="churn-hour-auto"
                    className="h-11 rounded-xl border-border/40 bg-background/60 text-[14px] tabular-nums"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {hourOptions.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h.toString().padStart(2, '0')}:00 UTC
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground/80">
            <span className="font-medium text-foreground/82">Weekly</span> waits at least seven days since the previous
            run before the next window. Persist options with{' '}
            <span className="font-medium text-foreground/85">Save</span> under Configuration.
          </p>
        </CardContent>
      </Card>

      <Card className={cn(surfaceCard, 'overflow-hidden')}>
        <CardHeader className="space-y-3 border-b border-border/25 px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
          <p className={sectionKicker}>Configuration</p>
          <CardTitle className={`${sectionHeading} font-sans`}>Schedule &amp; rules</CardTitle>
          <CardDescription className={`${sectionSub} !mt-3 max-w-none`}>
            Qualification, notifications, and follow-ups. Cadence is set in Automatic scans above; manual Scan now ignores
            it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 px-6 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
          {/* Who qualifies */}
          <section className="space-y-6 pb-12 sm:pb-14" aria-labelledby="churn-who-heading">
            <div>
              <h2 id="churn-who-heading" className={blockHeading}>
                Who qualifies
              </h2>
              <p className={blockSub}>
                OnlyFans and Fansly fans in your CRM. Narrow windows mean fewer, sharper names.
              </p>
            </div>
            <div className={insetFieldGroup}>
              <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
                <div className="space-y-2">
                  <Label htmlFor="exp-d" className={labelClass}>
                    Renewal window
                  </Label>
                  <p className="text-[12px] leading-relaxed text-muted-foreground/85">
                    Days until subscription end to include.
                  </p>
                  <Input
                    id="exp-d"
                    type="number"
                    min={1}
                    max={90}
                    value={expiringWithinDays}
                    onChange={(e) => setExpiringWithinDays(Number(e.target.value))}
                    className="h-11 rounded-xl border-border/40 text-[14px] tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stale-d" className={labelClass}>
                    Quiet subscriber
                  </Label>
                  <p className="text-[12px] leading-relaxed text-muted-foreground/85">
                    Days since last message to treat as quiet.
                  </p>
                  <Input
                    id="stale-d"
                    type="number"
                    min={3}
                    max={60}
                    value={staleDays}
                    onChange={(e) => setStaleDays(Number(e.target.value))}
                    className="h-11 rounded-xl border-border/40 text-[14px] tabular-nums"
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-4 rounded-xl border border-border/25 bg-background/40 px-4 py-4 dark:bg-background/20">
                <Checkbox
                  id="stale-include"
                  className="mt-0.5 border-border/50"
                  checked={includeStale}
                  onCheckedChange={(v) => setIncludeStale(v === true)}
                />
                <div className="min-w-0">
                  <label htmlFor="stale-include" className="cursor-pointer text-[14px] font-medium text-foreground">
                    Include quiet fans, not only renewals
                  </label>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    When off, only subscribers nearing expiry are considered.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-border/30" aria-hidden />

          {/* Batch size & credits */}
          <section className="space-y-6 py-12 sm:py-14" aria-labelledby="churn-batch-heading">
            <div>
              <h2 id="churn-batch-heading" className={blockHeading}>
                Batch &amp; credits
              </h2>
              <p className={blockSub}>Credits when someone matches apply to every path. Scheduled runs use Fans per run; Scan now analyzes all synced CRM (OnlyFans + Fansly together, up to 25 qualifiers).</p>
            </div>
            <div className={insetFieldGroup}>
              <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
                <div className="space-y-2">
                  <Label htmlFor="max-f" className={labelClass}>
                    Fans per run
                  </Label>
                  <p className="text-[12px] leading-relaxed text-muted-foreground/85">
                    Automatic scans: max per report (1–25). Scan now considers both platforms together, up to 25 qualifiers.
                  </p>
                  <Input
                    id="max-f"
                    type="number"
                    min={1}
                    max={25}
                    value={maxFans}
                    onChange={(e) => setMaxFans(Number(e.target.value))}
                    className="h-11 rounded-xl border-border/40 text-[14px] tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits" className={labelClass}>
                    Credits per match
                  </Label>
                  <p className="text-[12px] leading-relaxed text-muted-foreground/85">Up to this many after a successful run (1–10).</p>
                  <Input
                    id="credits"
                    type="number"
                    min={1}
                    max={10}
                    value={creditsPerRun}
                    onChange={(e) => setCreditsPerRun(Number(e.target.value))}
                    className="h-11 rounded-xl border-border/40 text-[14px] tabular-nums"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-border/30" aria-hidden />

          {/* Notifications */}
          <section className="space-y-6 py-12 sm:py-14" aria-labelledby="churn-notify-heading">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-muted/[0.08]">
                <Bell className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <h2 id="churn-notify-heading" className={blockHeading}>
                  Notifications
                </h2>
                <p className={`${blockSub} !mt-2`}>After each automatic run, what should reach your inbox.</p>
              </div>
            </div>
            <div className="divide-y divide-border/25 overflow-hidden rounded-2xl border border-border/25 bg-muted/[0.04] dark:bg-muted/[0.06]">
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-4">
                <div className="min-w-0 pr-2">
                  <p className="text-[14px] font-medium text-foreground">Run ready</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">New report is available.</p>
                </div>
                <Switch checked={notifySummary} onCheckedChange={setNotifySummary} aria-label="Notify when a run completes with matches" />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-4">
                <div className="min-w-0 pr-2">
                  <p className="text-[14px] font-medium text-foreground">Empty run</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">No one matched this time.</p>
                </div>
                <Switch checked={notifyEmpty} onCheckedChange={setNotifyEmpty} aria-label="Notify on empty run" />
              </div>
            </div>
          </section>

          <div className="h-px bg-border/30" aria-hidden />

          {/* Follow-ups */}
          <section className="space-y-6 py-12 sm:pb-10 sm:pt-14" aria-labelledby="churn-followups-heading">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-muted/[0.08]">
                <ListTodo className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <h2 id="churn-followups-heading" className={blockHeading}>
                  Follow-ups
                </h2>
                <p className={`${blockSub} !mt-2`}>Optional tasks in Manager and on your protocol list.</p>
              </div>
            </div>
            <div className="divide-y divide-border/25 overflow-hidden rounded-2xl border border-border/25 bg-muted/[0.04] dark:bg-muted/[0.06]">
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-4">
                <div className="min-w-0 pr-2">
                  <p className="text-[14px] font-medium text-foreground">Manager</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">Suggested task you can accept or dismiss.</p>
                </div>
                <Switch checked={linkMgr} onCheckedChange={setLinkMgr} aria-label="Create Divine Manager suggestion" />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-4">
                <div className="min-w-0 pr-2">
                  <p className="text-[14px] font-medium text-foreground">Protocol</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">Checklist item with your other automations.</p>
                </div>
                <Switch checked={linkProto} onCheckedChange={setLinkProto} aria-label="Create protocol task" />
              </div>
            </div>
            <Link
              href="/dashboard/divine-manager"
              className="inline-flex text-[14px] font-medium text-foreground underline-offset-[5px] transition hover:underline"
            >
              Open Divine Manager
            </Link>
          </section>

          <div className="flex flex-col gap-4 border-t border-border/25 pt-10 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="h-12 rounded-xl px-8 text-[15px] font-medium shadow-sm"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            {savedAt ? (
              <span className="text-[13px] tabular-nums text-muted-foreground">Saved {savedAt}</span>
            ) : (
              <span className="text-[13px] text-muted-foreground/80">Unsaved changes are lost if you leave.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={cn(surfaceCard, 'overflow-hidden')}>
        <CardHeader className="border-b border-border/25 px-6 py-6 sm:px-8 sm:py-7">
          <p className={sectionKicker}>History</p>
          <CardTitle className="mt-2 font-sans text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Last run
          </CardTitle>
          <CardDescription className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {lastRunAt ? `Completed ${new Date(lastRunAt).toLocaleString()}` : 'No automatic run yet.'}
            {lastError ? (
              <span className="mt-2 block text-[13px] text-destructive">Error: {lastError}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6 sm:px-8 sm:py-7">
          {digest ? (
            <div className="space-y-3">
              <p className="text-[12px] tabular-nums text-muted-foreground">
                {digestAt ? `${new Date(digestAt).toLocaleString()}` : 'Latest output'}
              </p>
              <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border/35 bg-muted/[0.06] p-5 dark:bg-muted/[0.08]">
                <AiToolMarkdownReadout content={digest} variant="circeRetention" className="text-[13px]" />
              </div>
            </div>
          ) : (
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              No results yet. After a scheduled or manual batch run, they appear here. Keep{' '}
              <Link href="/dashboard/fans" className="font-medium text-foreground underline-offset-4 hover:underline">
                Fans
              </Link>{' '}
              synced so renewals and spend stay accurate.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
