'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, Bell, Gavel, Radar, Shield, Clock, ChevronRight } from 'lucide-react'

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

function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-[3.25rem] items-center justify-between gap-4 py-1', className)}>{children}</div>
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
  const triageBase =
    'flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-all sm:text-sm'

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-10 pb-16 pt-1">
      {/* Page title + subtitle: shared DashboardRouteHero in main shell (same card as Mentions) */}

      {/* Triage — segment-style */}
      <div>
        <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/90">Go to</p>
        <div className="inline-flex w-full max-w-md rounded-2xl border border-border/60 bg-muted/20 p-1">
          <Link
            href="/dashboard/protection?severity=critical,high"
            className={cn(
              triageBase,
              'bg-background/90 text-foreground shadow-sm ring-1 ring-border/40',
            )}
          >
            Urgent
          </Link>
          <Link
            href="/dashboard/protection"
            className={cn(triageBase, 'text-muted-foreground hover:text-foreground')}
          >
            All leaks
          </Link>
          <Link
            href="/dashboard/mentions"
            className={cn(triageBase, 'text-muted-foreground hover:text-foreground')}
          >
            Reputation
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Schedule group */}
      <div className="space-y-2">
        <h2 className="px-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Schedule</h2>
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/50 bg-card/20">
          <div className="p-1">
            <FieldRow>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                  <Shield className="h-4 w-4 text-violet-300" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium">Shield</p>
                  <p className="text-[11px] text-muted-foreground">On · scheduled runs</p>
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </FieldRow>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="text-xs font-medium uppercase tracking-wider">Sentinel</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Cadence</Label>
                <Select
                  value={scanCadence}
                  onValueChange={(v) => setScanCadence(v as 'off' | 'daily' | 'weekly')}
                >
                  <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scan-hour" className="text-[11px] text-muted-foreground">
                  Hour (UTC)
                </Label>
                <Select value={String(scanHourUtc)} onValueChange={(v) => setScanHourUtc(parseInt(v, 10))}>
                  <SelectTrigger id="scan-hour" className="h-10 rounded-xl border-border/60 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {hourOptions.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan defaults */}
      <div className="space-y-2">
        <h2 className="px-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Scan</h2>
        <div className="space-y-0 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-card/20 px-4 py-1">
          <div className="flex items-start gap-3 py-3">
            <Checkbox id="strict" checked={leakStrict} onCheckedChange={(v) => setLeakStrict(v === true)} />
            <label htmlFor="strict" className="cursor-pointer text-sm leading-snug text-muted-foreground">
              Strict match (recommended)
            </label>
          </div>
          <div className="flex items-start gap-3 py-3">
            <Checkbox id="titles" checked={includeTitles} onCheckedChange={(v) => setIncludeTitles(v === true)} />
            <label htmlFor="titles" className="cursor-pointer text-sm leading-snug text-muted-foreground">
              Include your library titles
            </label>
          </div>
        </div>
      </div>

      {/* Hammer */}
      <div className="space-y-2">
        <h2 className="px-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Drafts</h2>
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/20">
          <div className="border-b border-border/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gavel className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="text-xs font-medium uppercase tracking-wider">DMCA</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground/90">Auto-create drafts you review &amp; send—never auto-filed.</p>
            <div className="mt-3 flex items-center justify-between">
              <Label htmlFor="auto-dmca" className="text-sm">
                After each run
              </Label>
              <Switch id="auto-dmca" checked={autoDmca} onCheckedChange={setAutoDmca} />
            </div>
          </div>
          {autoDmca ? (
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
                <Checkbox
                  id="ack-dmca"
                  checked={autoDmcaAck}
                  onCheckedChange={(v) => setAutoDmcaAck(v === true)}
                />
                <label htmlFor="ack-dmca" className="cursor-pointer text-xs leading-relaxed text-muted-foreground">
                  I review every notice before a host sees it
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Severity</Label>
                <Select value={minSeverity} onValueChange={(v) => setMinSeverity(v as 'high' | 'critical')}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High + critical</SelectItem>
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
                <label htmlFor="page-verified" className="text-xs text-muted-foreground cursor-pointer">
                  Page-verify match only
                </label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-run" className="text-[11px]">
                  Max / run
                </Label>
                <Input
                  id="max-run"
                  type="number"
                  min={0}
                  max={50}
                  className="h-10 rounded-xl"
                  value={maxPerRun}
                  onChange={(e) => setMaxPerRun(Math.min(50, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        <h2 className="px-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Alerts</h2>
        <div className="space-y-0 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-card/20 px-4 py-1">
          <div className="flex items-center gap-2 py-2.5 text-muted-foreground">
            <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="text-xs">In-app</span>
          </div>
          <div className="flex items-start gap-3 py-2.5">
            <Checkbox id="n-sum" checked={notifySummary} onCheckedChange={(v) => setNotifySummary(v === true)} />
            <label htmlFor="n-sum" className="text-sm text-muted-foreground cursor-pointer">
              One summary
            </label>
          </div>
          <div className="flex items-start gap-3 py-2.5">
            <Checkbox id="n-leak" checked={notifyLeak} onCheckedChange={(v) => setNotifyLeak(v === true)} />
            <label htmlFor="n-leak" className="text-sm text-muted-foreground cursor-pointer">
              Each new leak
            </label>
          </div>
          <div className="flex items-start gap-3 py-2.5">
            <Checkbox id="n-draft" checked={notifyDraft} onCheckedChange={(v) => setNotifyDraft(v === true)} />
            <label htmlFor="n-draft" className="text-sm text-muted-foreground cursor-pointer">
              Drafts ready
            </label>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <h2 className="px-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Activity</h2>
        <div className="rounded-2xl border border-border/50 bg-muted/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Radar className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wider">Last scan</span>
          </div>
          <p className="mt-1.5 tabular-nums text-foreground/90">
            {lastLeakScanAt ? new Date(lastLeakScanAt).toLocaleString() : '—'}
          </p>
          {lastLeakError ? <p className="mt-1 text-xs text-destructive">{lastLeakError}</p> : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Drafts: {lastAutoDmcaAt ? new Date(lastAutoDmcaAt).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-0.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/protection">
            Protection
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {savedAt ? <span className="text-xs text-muted-foreground">Saved {savedAt}</span> : null}
          <Button
            onClick={() => void save()}
            disabled={saving || (autoDmca && !autoDmcaAck)}
            className="h-9 rounded-full px-6"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
