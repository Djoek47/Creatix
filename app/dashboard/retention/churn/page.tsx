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
import { Loader2, RadioTower, Sparkles, BarChart3, Bell, ListTodo } from 'lucide-react'
import type { CirceChurnSettingsRow } from '@/lib/circe-churn/run-for-user'

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
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-background to-fuchsia-950/30 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-200/90">
              <Sparkles className="h-3 w-3 text-amber-300/90" />
              Pro · background job · same credit model as manual runs
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Churn Predictor</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              While you are offline, Circe scans CRM fans whose subscriptions are ending soon or who have gone quiet in
              DMs. She batches them into one retention digest: likely reasons they drift, treats (including ideas to
              unlock or gift past PPV), and draft messages—plus Divine notifications when a run completes.
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0 border border-white/10">
            <Link href="/dashboard/ai-studio/tools/churn-predictor">
              <BarChart3 className="mr-2 h-4 w-4" />
              Deep dive one fan
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="border-border">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="rounded-lg bg-primary/10 p-2">
            <RadioTower className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Background radar</CardTitle>
            <CardDescription>
              Hourly cron checks your UTC slot; daily/weekly cadence controls how often a run actually fires. Each run
              charges <span className="font-medium text-foreground">{creditsPerRun} AI credits</span> when fans match
              your rules (same family as the 2-credit manual Churn Predictor).
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
            <p className="text-sm text-muted-foreground">
              After the first scheduled run, the full digest appears here. Sync OnlyFans/Fansly CRM so expiry dates and
              spend are real.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
