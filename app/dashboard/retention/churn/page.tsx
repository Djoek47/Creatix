'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format, isValid, parseISO } from 'date-fns'
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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  parseCalendarTeaserStored,
  serializeCalendarTeaserStored,
} from '@/lib/circe-churn/calendar-teaser-notes-format'
import {
  Loader2,
  RadioTower,
  BarChart3,
  Bell,
  ListTodo,
  Calendar as CalendarIcon,
  ScanLine,
  Plus,
  X,
  Coins,
} from 'lucide-react'
import type { CirceChurnSettingsRow } from '@/lib/circe-churn/run-for-user'

type TeaserRow = { id: string; date: Date | undefined; text: string }

const MAX_CAL_TEASER_ROWS = 24

export default function ChurnPredictorHubPage() {
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
  const [teaseFutureContent, setTeaseFutureContent] = useState(true)
  const [teaserRows, setTeaserRows] = useState<TeaserRow[]>(() => [
    { id: crypto.randomUUID(), date: undefined, text: '' },
  ])

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
      setTeaseFutureContent(s.tease_future_content !== false)
      const lines = parseCalendarTeaserStored(s.calendar_teaser_notes)
      setTeaserRows(
        lines.length > 0
          ? lines.map((l) => {
              let date: Date | undefined
              if (l.date) {
                const d = parseISO(l.date)
                date = isValid(d) ? d : undefined
              }
              return { id: crypto.randomUUID(), date, text: l.text }
            })
          : [{ id: crypto.randomUUID(), date: undefined, text: '' }],
      )
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

  const serializedCalendarTeasers = serializeCalendarTeaserStored(
    teaserRows.map((r) => ({
      date: r.date ? format(r.date, 'yyyy-MM-dd') : '',
      text: r.text,
    })),
  )

  const patchTeaserRow = useCallback((id: string, patch: Partial<Pick<TeaserRow, 'date' | 'text'>>) => {
    setTeaserRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const addTeaserRow = useCallback(() => {
    setTeaserRows((rows) =>
      rows.length >= MAX_CAL_TEASER_ROWS
        ? rows
        : [...rows, { id: crypto.randomUUID(), date: undefined, text: '' }],
    )
  }, [])

  const removeTeaserRow = useCallback((id: string) => {
    setTeaserRows((rows) => {
      const next = rows.filter((r) => r.id !== id)
      return next.length > 0 ? next : [{ id: crypto.randomUUID(), date: undefined, text: '' }]
    })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#future-tease') return
    requestAnimationFrame(() => {
      document.getElementById('future-tease')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

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
          tease_future_content: teaseFutureContent,
          calendar_teaser_notes: serializedCalendarTeasers,
        }),
      })
      const data = await res.json().catch(() => ({}))
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
      const saveFirst = await fetch('/api/circe-churn/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tease_future_content: teaseFutureContent,
          calendar_teaser_notes: serializedCalendarTeasers,
        }),
      })
      if (!saveFirst.ok) {
        const data = await saveFirst.json().catch(() => ({}))
        setError(typeof data.error === 'string' ? data.error : 'Could not save teaser settings')
        return
      }
      const res = await fetch('/api/circe-churn/run', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 402) {
        setError(typeof data.error === 'string' ? data.error : 'Insufficient AI credits')
        return
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Scan failed')
        return
      }
      await load()
    } catch {
      setError('Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i)

  const scanCreditCost = Math.min(10, Math.max(1, Math.round(Number(creditsPerRun) || 2)))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="border-b border-border/80 pb-10">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
          <div className="max-w-lg space-y-5">
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Pro · Background · Same credits as manual
            </p>
            <div className="space-y-3">
              <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Churn Predictor
              </h1>
              <p className="text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                Spots fans before they slip away. One digest—why they may be drifting, what to try, and drafts to send.
                Notified when it&apos;s ready.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-col gap-1.5 sm:items-end">
              <Button
                type="button"
                size="lg"
                className="h-11 rounded-full px-6 font-medium"
                disabled={scanning}
                onClick={() => void runScanNow()}
                title={`Uses up to ${scanCreditCost} AI credit${scanCreditCost === 1 ? '' : 's'} when at least one fan matches your churn rules (same as “Credits per run”). Nothing debited if no one qualifies.`}
              >
                {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                Scan now
              </Button>
              <p className="flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground sm:max-w-[13.5rem] sm:text-right">
                <Coins className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                <span>
                  <span className="tabular-nums font-medium text-foreground/85">{scanCreditCost}</span> credit
                  {scanCreditCost === 1 ? '' : 's'} if at-risk fans are found ·{' '}
                  <span className="text-muted-foreground/90">0 if no match</span>
                </span>
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="h-11 rounded-full border-border/80 bg-transparent px-6 font-medium shadow-none">
              <Link href="/dashboard/ai-studio/tools/churn-predictor">
                <BarChart3 className="mr-2 h-4 w-4 opacity-70" />
                Deep dive one fan
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section id="future-tease">
        <Card className="border-border/80 bg-muted/10 shadow-none">
          <CardHeader className="space-y-0 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl space-y-1.5">
                <CardTitle className="font-serif text-xl font-semibold tracking-tight">Content calendar</CardTitle>
                <CardDescription className="text-[15px] leading-relaxed">
                  Add dated plans so churn digests can reference real drops—not invented ones.
                </CardDescription>
              </div>
              <Switch
                checked={teaseFutureContent}
                onCheckedChange={setTeaseFutureContent}
                aria-label="Include future content teasers in digest"
                className="shrink-0 data-[state=checked]:bg-foreground"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-3">
              {teaserRows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    'flex flex-col gap-2 sm:flex-row sm:items-center',
                    !teaseFutureContent && 'pointer-events-none opacity-45',
                  )}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!teaseFutureContent}
                        className={cn(
                          'h-10 w-full shrink-0 justify-start rounded-full border-border/80 px-3.5 font-normal shadow-none sm:w-[10.5rem]',
                          !row.date && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-55" aria-hidden />
                        {row.date ? format(row.date, 'MMM d, yyyy') : 'Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden border-border/60 p-0 shadow-md" align="start">
                      <Calendar
                        mode="single"
                        selected={row.date}
                        onSelect={(d) => patchTeaserRow(row.id, { date: d })}
                        captionLayout="dropdown"
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 2}
                        className="rounded-lg"
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={row.text}
                    onChange={(e) => patchTeaserRow(row.id, { text: e.target.value.slice(0, 500) })}
                    placeholder="What's planned that day"
                    disabled={!teaseFutureContent}
                    className="h-10 flex-1 rounded-full border-border/80 bg-background/80 shadow-none"
                    aria-label={`Plan for ${row.date ? format(row.date, 'yyyy-MM-dd') : 'undated row'}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!teaseFutureContent || teaserRows.length <= 1}
                    className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => removeTeaserRow(row.id)}
                    aria-label="Remove row"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!teaseFutureContent || teaserRows.length >= MAX_CAL_TEASER_ROWS}
                className="h-9 w-fit gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground"
                onClick={addTeaserRow}
              >
                <Plus className="h-4 w-4" />
                Add date
              </Button>
              <p className="text-xs text-muted-foreground">
                Saved with <span className="text-foreground">Save</span> or when you run <span className="text-foreground">Scan now</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="rounded-lg bg-primary/10 p-2">
            <RadioTower className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Background radar</CardTitle>
            <CardDescription>
              When this is on, Circe can look for at-risk fans on the schedule you set below—daily, weekly, or off. You
              only use{' '}
              <span className="font-medium text-foreground">
                {creditsPerRun} AI credit{creditsPerRun === 1 ? '' : 's'}
              </span>{' '}
              when a run actually finds fans that match your rules—the same cost as tapping Scan now yourself.
            </CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Churn background enabled" />
        </CardHeader>
      </Card>

      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-none backdrop-blur-sm dark:bg-card/50">
        <CardHeader className="space-y-3 pb-2">
          <CardTitle className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Schedule &amp; rules
          </CardTitle>
          <CardDescription className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground/90">
            Decide when automatic scans run, which subscribers qualify, and what you want to be notified about. Manual
            &quot;Scan now&quot; always works on demand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 pb-8">
          {/* When it runs */}
          <section className="space-y-5 pb-10" aria-labelledby="churn-schedule-heading">
            <div>
              <h2 id="churn-schedule-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
                When it runs
              </h2>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground/88">
                Background radar follows this schedule. Turn it on in the card above.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="churn-cadence" className="text-[13px] font-medium text-foreground/90">
                  How often
                </Label>
                <Select value={runCadence} onValueChange={(v) => setRunCadence(v as 'off' | 'daily' | 'weekly')}>
                  <SelectTrigger id="churn-cadence" className="h-11 rounded-xl text-[13px] md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off — manual scans only</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="churn-hour" className="text-[13px] font-medium text-foreground/90">
                  Time of day
                </Label>
                <Select value={String(runHourUtc)} onValueChange={(v) => setRunHourUtc(Number.parseInt(v, 10))}>
                  <SelectTrigger id="churn-hour" className="h-11 rounded-xl text-[13px] md:text-sm">
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
                <p className="text-[12px] leading-snug text-muted-foreground/85">
                  Universal Time (UTC). Used when you set How often to Daily or Weekly; safe to set in advance.
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-border/50" aria-hidden />

          {/* Who qualifies */}
          <section className="space-y-5 py-10" aria-labelledby="churn-who-heading">
            <div>
              <h2 id="churn-who-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
                Who qualifies
              </h2>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground/88">
                We look at OnlyFans and Fansly fans synced to your CRM. Tighter windows surface fewer, higher-signal names.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp-d" className="text-[13px] font-medium text-foreground/90">
                  Renewal window
                </Label>
                <p className="text-[12px] leading-snug text-muted-foreground/85">
                  Flag active subscriptions that end within this many days.
                </p>
                <Input
                  id="exp-d"
                  type="number"
                  min={1}
                  max={90}
                  value={expiringWithinDays}
                  onChange={(e) => setExpiringWithinDays(Number(e.target.value))}
                  className="h-11 rounded-xl text-[13px] tabular-nums md:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stale-d" className="text-[13px] font-medium text-foreground/90">
                  Quiet subscriber
                </Label>
                <p className="text-[12px] leading-snug text-muted-foreground/85">
                  Treat someone as quiet if you haven&apos;t messaged them in this many days.
                </p>
                <Input
                  id="stale-d"
                  type="number"
                  min={3}
                  max={60}
                  value={staleDays}
                  onChange={(e) => setStaleDays(Number(e.target.value))}
                  className="h-11 rounded-xl text-[13px] tabular-nums md:text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 bg-muted/15 px-4 py-3.5 dark:bg-muted/10">
              <Checkbox
                id="stale-include"
                className="mt-0.5"
                checked={includeStale}
                onCheckedChange={(v) => setIncludeStale(v === true)}
              />
              <div className="min-w-0">
                <label htmlFor="stale-include" className="cursor-pointer text-[13px] font-medium text-foreground">
                  Include quiet fans, not only renewals
                </label>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground/85">
                  Off means you only watch people nearing the end of their subscription period.
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-border/50" aria-hidden />

          {/* Batch size & credits */}
          <section className="space-y-5 py-10" aria-labelledby="churn-batch-heading">
            <div>
              <h2 id="churn-batch-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
                Batch size &amp; credits
              </h2>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground/88">
                Caps how many people go into one digest. Credits apply only when at least one person matches—same as
                &quot;Scan now.&quot;
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max-f" className="text-[13px] font-medium text-foreground/90">
                  Fans per digest
                </Label>
                <p className="text-[12px] leading-snug text-muted-foreground/85">Maximum at-risk fans in a single report (1–25).</p>
                <Input
                  id="max-f"
                  type="number"
                  min={1}
                  max={25}
                  value={maxFans}
                  onChange={(e) => setMaxFans(Number(e.target.value))}
                  className="h-11 rounded-xl text-[13px] tabular-nums md:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits" className="text-[13px] font-medium text-foreground/90">
                  Credits when matches are found
                </Label>
                <p className="text-[12px] leading-snug text-muted-foreground/85">
                  AI credits debited after a successful digest, up to this amount (1–10).
                </p>
                <Input
                  id="credits"
                  type="number"
                  min={1}
                  max={10}
                  value={creditsPerRun}
                  onChange={(e) => setCreditsPerRun(Number(e.target.value))}
                  className="h-11 rounded-xl text-[13px] tabular-nums md:text-sm"
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-border/50" aria-hidden />

          {/* Notifications */}
          <section className="space-y-4 py-10" aria-labelledby="churn-notify-heading">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                <Bell className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h2 id="churn-notify-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
                  Notifications
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground/88">
                  Choose what pings your Divine inbox after each automatic run.
                </p>
              </div>
            </div>
            <div className="space-y-1 rounded-2xl border border-border/45 bg-muted/10 p-1 dark:bg-muted/5">
              <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">Digest ready</p>
                  <p className="text-[12px] leading-snug text-muted-foreground/85">When a new churn report is available in Divine.</p>
                </div>
                <Switch checked={notifySummary} onCheckedChange={setNotifySummary} aria-label="Notify when digest is ready" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">No matches</p>
                  <p className="text-[12px] leading-snug text-muted-foreground/85">When no subscriber met your rules this run.</p>
                </div>
                <Switch checked={notifyEmpty} onCheckedChange={setNotifyEmpty} aria-label="Notify on empty run" />
              </div>
            </div>
          </section>

          <div className="h-px bg-border/50" aria-hidden />

          {/* Follow-ups */}
          <section className="space-y-4 py-10" aria-labelledby="churn-followups-heading">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                <ListTodo className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h2 id="churn-followups-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
                  Follow-ups
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground/88">
                  Optionally turn each digest into concrete next steps in Divine Manager and on your protocol rail.
                </p>
              </div>
            </div>
            <div className="space-y-1 rounded-2xl border border-border/45 bg-muted/10 p-1 dark:bg-muted/5">
              <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">Manager suggestion</p>
                  <p className="text-[12px] leading-snug text-muted-foreground/85">Add a suggested task you can accept or dismiss.</p>
                </div>
                <Switch checked={linkMgr} onCheckedChange={setLinkMgr} aria-label="Create Divine Manager suggestion" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">Protocol to-do</p>
                  <p className="text-[12px] leading-snug text-muted-foreground/85">Surface a checklist item alongside your other automations.</p>
                </div>
                <Switch checked={linkProto} onCheckedChange={setLinkProto} aria-label="Create protocol task" />
              </div>
            </div>
            <Link
              href="/dashboard/divine-manager"
              className="inline-flex text-[13px] font-medium text-foreground underline-offset-4 transition hover:underline"
            >
              Open Divine Manager
            </Link>
          </section>

          <div className="flex flex-col gap-3 border-t border-border/50 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="h-11 rounded-xl px-6 text-[15px] font-medium"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
            {savedAt ? (
              <span className="text-[13px] text-muted-foreground/90">Saved {savedAt}</span>
            ) : (
              <span className="text-[13px] text-muted-foreground/70">Changes apply after you save.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Last run</CardTitle>
          <CardDescription>
            {lastRunAt ? `Completed ${new Date(lastRunAt).toLocaleString()}` : 'No background run yet.'}
            {lastError ? (
              <span className="mt-1 block text-destructive">Error: {lastError}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {digest ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {digestAt ? `Digest ${new Date(digestAt).toLocaleString()}` : 'Latest digest'}
              </p>
              <div className="max-h-[480px] overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{digest}</pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No digest yet. When background churn runs on your schedule, the latest batch report will show here. Sync
              OnlyFans or Fansly from{' '}
              <Link href="/dashboard/fans" className="text-circe underline-offset-4 hover:underline">
                Fans
              </Link>{' '}
              so subscription end dates and spend match the platform.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
