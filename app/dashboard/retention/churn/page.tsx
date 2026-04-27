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
import { Loader2, RadioTower, BarChart3, Bell, ListTodo, Calendar as CalendarIcon, ScanLine, Plus, X } from 'lucide-react'
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
            <Button
              type="button"
              size="lg"
              className="h-11 rounded-full px-6 font-medium"
              disabled={scanning}
              onClick={() => void runScanNow()}
            >
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
              Scan now
            </Button>
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

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Schedule &amp; rules</CardTitle>
          <CardDescription>Who gets picked: expiring subscriptions and/or unusually quiet active subs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cadence</Label>
              <Select value={runCadence} onValueChange={(v) => setRunCadence(v as 'off' | 'daily' | 'weekly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Run hour (UTC)</Label>
              <Select
                value={String(runHourUtc)}
                onValueChange={(v) => setRunHourUtc(Number.parseInt(v, 10))}
              >
                <SelectTrigger>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exp-d">Flag subs ending within (days)</Label>
              <Input
                id="exp-d"
                type="number"
                min={1}
                max={90}
                value={expiringWithinDays}
                onChange={(e) => setExpiringWithinDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stale-d">&quot;Quiet&quot; = no DM this many days</Label>
              <Input
                id="stale-d"
                type="number"
                min={3}
                max={60}
                value={staleDays}
                onChange={(e) => setStaleDays(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="stale-include"
              checked={includeStale}
              onCheckedChange={(v) => setIncludeStale(v === true)}
            />
            <label htmlFor="stale-include" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              Include active subs who are quiet (not only expiring). Turn off to only watch renewal windows.
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-f">Max fans per batch</Label>
              <Input
                id="max-f"
                type="number"
                min={1}
                max={25}
                value={maxFans}
                onChange={(e) => setMaxFans(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits">Credits per run</Label>
              <Input
                id="credits"
                type="number"
                min={1}
                max={10}
                value={creditsPerRun}
                onChange={(e) => setCreditsPerRun(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Digest ready (Divine tab)</span>
              <Switch checked={notifySummary} onCheckedChange={setNotifySummary} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Ping when no one matched (empty run)</span>
              <Switch checked={notifyEmpty} onCheckedChange={setNotifyEmpty} />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-violet-500/[0.06] p-3">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium">Divine Manager &amp; protocol</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Each batch can add a <span className="font-medium text-foreground">suggested manager task</span> (type{' '}
              <code className="rounded bg-muted px-1">churn_retention_digest</code>) and a{' '}
              <span className="font-medium text-foreground">protocol to-do</span> on the floating rail — same paths as
              whale tips and other Divine automations.
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Create Divine Manager suggestion</span>
              <Switch checked={linkMgr} onCheckedChange={setLinkMgr} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Create protocol task</span>
              <Switch checked={linkProto} onCheckedChange={setLinkProto} />
            </div>
            <Button variant="link" className="h-auto justify-start p-0 text-xs" asChild>
              <Link href="/dashboard/divine-manager">Open Divine Manager</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            {savedAt ? <span className="text-xs text-muted-foreground">Saved {savedAt}</span> : null}
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
