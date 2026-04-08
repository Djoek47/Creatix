'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2, Shield, Clock, Gavel, ArrowRight } from 'lucide-react'
type AegisSettings = {
  user_id: string
  enabled: boolean
  scan_cadence: 'off' | 'daily' | 'weekly'
  scan_hour_utc: number
  leak_scan_strict: boolean
  include_content_titles: boolean
  last_leak_scan_at: string | null
  last_leak_scan_error: string | null
  auto_dmca_draft_enabled: boolean
  auto_dmca_min_severity: 'high' | 'critical'
  auto_dmca_require_page_verified: boolean
  auto_dmca_max_per_run: number
  last_auto_dmca_at: string | null
  notify_on_scan_summary: boolean
  notify_on_new_leak: boolean
  notify_on_auto_draft: boolean
}

export default function CirceAegisPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [scanCadence, setScanCadence] = useState<'off' | 'daily' | 'weekly'>('off')
  const [scanHourUtc, setScanHourUtc] = useState(6)
  const [leakStrict, setLeakStrict] = useState(true)
  const [includeTitles, setIncludeTitles] = useState(true)
  const [autoDmca, setAutoDmca] = useState(false)
  const [autoDmcaAck, setAutoDmcaAck] = useState(false)
  const [minSeverity, setMinSeverity] = useState<'high' | 'critical'>('high')
  const [requirePageVerified, setRequirePageVerified] = useState(false)
  const [maxPerRun, setMaxPerRun] = useState(5)
  const [notifySummary, setNotifySummary] = useState(true)
  const [notifyLeak, setNotifyLeak] = useState(true)
  const [notifyDraft, setNotifyDraft] = useState(true)

  const [lastLeakScanAt, setLastLeakScanAt] = useState<string | null>(null)
  const [lastLeakError, setLastLeakError] = useState<string | null>(null)
  const [lastAutoDmcaAt, setLastAutoDmcaAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/circe-aegis/settings')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not load settings')
        return
      }
      const s = data.settings as AegisSettings
      setEnabled(s.enabled)
      setScanCadence(s.scan_cadence)
      setScanHourUtc(s.scan_hour_utc)
      setLeakStrict(s.leak_scan_strict)
      setIncludeTitles(s.include_content_titles)
      setAutoDmca(s.auto_dmca_draft_enabled)
      setMinSeverity(s.auto_dmca_min_severity)
      setRequirePageVerified(s.auto_dmca_require_page_verified)
      setMaxPerRun(s.auto_dmca_max_per_run)
      setNotifySummary(s.notify_on_scan_summary)
      setNotifyLeak(s.notify_on_new_leak)
      setNotifyDraft(s.notify_on_auto_draft)
      setLastLeakScanAt(s.last_leak_scan_at)
      setLastLeakError(s.last_leak_scan_error)
      setLastAutoDmcaAt(s.last_auto_dmca_at)
      if (s.auto_dmca_draft_enabled) setAutoDmcaAck(true)
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
      const body: Record<string, unknown> = {
        enabled,
        scan_cadence: scanCadence,
        scan_hour_utc: scanHourUtc,
        leak_scan_strict: leakStrict,
        include_content_titles: includeTitles,
        auto_dmca_draft_enabled: autoDmca,
        auto_dmca_min_severity: minSeverity,
        auto_dmca_require_page_verified: requirePageVerified,
        auto_dmca_max_per_run: maxPerRun,
        notify_on_scan_summary: notifySummary,
        notify_on_new_leak: notifyLeak,
        notify_on_auto_draft: notifyDraft,
      }
      if (autoDmca) {
        body.ack_auto_dmca_review = autoDmcaAck
      }
      const res = await fetch('/api/circe-aegis/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Save failed')
        return
      }
      const s = data.settings as AegisSettings
      setLastLeakScanAt(s.last_leak_scan_at)
      setLastLeakError(s.last_leak_scan_error)
      setLastAutoDmcaAt(s.last_auto_dmca_at)
      setSavedAt(new Date().toLocaleTimeString())
      if (s.auto_dmca_draft_enabled) setAutoDmcaAck(true)
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Circe&apos;s Aegis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Background leak scans and optional DMCA <span className="font-medium text-foreground">drafts</span> while
          you&apos;re away. Review every candidate and every notice on Protection before you send anything to a host.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-circe/30 bg-circe/5 p-3 text-sm">
        <span className="text-muted-foreground">Triage:</span>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/dashboard/protection?severity=critical,high">Priority leak queue</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/protection">All active leaks</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/mentions">Mentions</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="border-border">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="rounded-lg bg-primary/10 p-2">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Shield</CardTitle>
            <CardDescription>Master switch for scheduled Aegis runs (cron uses your plan and Serper quota).</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Aegis enabled" />
        </CardHeader>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Sentinel</CardTitle>
          </div>
          <CardDescription>
            Cadence and UTC hour when the hourly job may run. Vercel invokes the cron each hour; your scan fires when
            the hour matches and the cadence allows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cadence</Label>
            <Select value={scanCadence} onValueChange={(v) => setScanCadence(v as 'off' | 'daily' | 'weekly')}>
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
            <Label htmlFor="scan-hour">Scan hour (UTC)</Label>
            <Select
              value={String(scanHourUtc)}
              onValueChange={(v) => setScanHourUtc(parseInt(v, 10))}
            >
              <SelectTrigger id="scan-hour">
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
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Leak scan defaults</CardTitle>
          <CardDescription>Same knobs as a manual Protection scan for scheduled runs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2">
            <Checkbox id="strict" checked={leakStrict} onCheckedChange={(v) => setLeakStrict(v === true)} />
            <label htmlFor="strict" className="text-sm leading-snug text-muted-foreground cursor-pointer">
              Strict keyword gate (recommended): require handle or title overlap in snippets.
            </label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="titles"
              checked={includeTitles}
              onCheckedChange={(v) => setIncludeTitles(v === true)}
            />
            <label htmlFor="titles" className="text-sm leading-snug text-muted-foreground cursor-pointer">
              Include published / scheduled titles from your content library in queries.
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Hammer (drafts only)</CardTitle>
          </div>
          <CardDescription>
            After each successful scan, optionally create <span className="text-foreground">draft</span> DMCA rows for
            severe leaks with no existing claim. You must review and send notices yourself — we do not file with third
            parties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="auto-dmca" className="cursor-pointer">
              Auto-create draft claims
            </Label>
            <Switch id="auto-dmca" checked={autoDmca} onCheckedChange={setAutoDmca} />
          </div>
          {autoDmca ? (
            <>
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
                <Checkbox
                  id="ack-dmca"
                  checked={autoDmcaAck}
                  onCheckedChange={(v) => setAutoDmcaAck(v === true)}
                />
                <label htmlFor="ack-dmca" className="text-sm leading-snug cursor-pointer">
                  I understand drafts are not sent automatically and I will review every notice before submitting to a
                  host or platform.
                </label>
              </div>
              <div className="space-y-2">
                <Label>Minimum severity</Label>
                <Select
                  value={minSeverity}
                  onValueChange={(v) => setMinSeverity(v as 'high' | 'critical')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High and critical</SelectItem>
                    <SelectItem value="critical">Critical only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="page-verified"
                  checked={requirePageVerified}
                  onCheckedChange={(v) => setRequirePageVerified(v === true)}
                />
                <label htmlFor="page-verified" className="text-sm leading-snug text-muted-foreground cursor-pointer">
                  Only when Grok page verify flagged a likely match (stricter gate).
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-run">Max drafts per run</Label>
                <Input
                  id="max-run"
                  type="number"
                  min={0}
                  max={50}
                  value={maxPerRun}
                  onChange={(e) => setMaxPerRun(Math.min(50, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
          <CardDescription>Divine in-app alerts after a scheduled run (when there is something to report).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox id="n-sum" checked={notifySummary} onCheckedChange={(v) => setNotifySummary(v === true)} />
            <label htmlFor="n-sum" className="text-sm text-muted-foreground cursor-pointer">
              Combined summary when new leaks or drafts were created
            </label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="n-leak" checked={notifyLeak} onCheckedChange={(v) => setNotifyLeak(v === true)} />
            <label htmlFor="n-leak" className="text-sm text-muted-foreground cursor-pointer">
              New leak candidates (if summary is off)
            </label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="n-draft" checked={notifyDraft} onCheckedChange={(v) => setNotifyDraft(v === true)} />
            <label htmlFor="n-draft" className="text-sm text-muted-foreground cursor-pointer">
              Auto-drafts ready (if summary is off)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Last run</CardTitle>
          <CardDescription>Updated by the server after each scheduled scan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Last leak scan: </span>
            {lastLeakScanAt ? new Date(lastLeakScanAt).toLocaleString() : '—'}
          </p>
          {lastLeakError ? (
            <p className="text-destructive">
              <span className="font-medium">Error: </span>
              {lastLeakError}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Last auto-draft batch: </span>
            {lastAutoDmcaAt ? new Date(lastAutoDmcaAt).toLocaleString() : '—'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="text-lg">Shortcuts</CardTitle>
          <CardDescription>
            Mentions track social reputation scans; Aegis automates leak search and draft DMCAs only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="justify-between" asChild>
            <Link href="/dashboard/protection">
              Protection dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="justify-between" asChild>
            <Link href="/dashboard/mentions">
              Mentions (reputation)
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save()} disabled={saving || (autoDmca && !autoDmcaAck)}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
        {savedAt ? <span className="text-xs text-muted-foreground">Saved {savedAt}</span> : null}
      </div>
    </div>
  )
}
