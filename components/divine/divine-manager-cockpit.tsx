'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Mic,
  Pause,
  RefreshCw,
  Settings2,
  Shield,
  Sparkles,
  Upload,
} from 'lucide-react'
import type { DivineTodayPlanResponse } from '@/lib/divine/today-plan-types'
import type { DivineManagerMode, DivineManagerSettingsRow } from '@/lib/divine-manager'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EasyProModeToggle, type EasyProUiMode } from '@/components/ui/easy-pro-mode-toggle'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { ProtocolOpenTasksListManage } from '@/components/divine/protocol-task-ui'
import { cn } from '@/lib/utils'

function modeCopy(mode: DivineManagerMode) {
  if (mode === 'off') return { label: 'Paused', tone: 'border-muted-foreground/30 text-muted-foreground' }
  if (mode === 'semi_auto') return { label: 'Semi-auto', tone: 'border-amber-500/35 text-amber-700 dark:text-amber-300' }
  return { label: 'Suggest only', tone: 'border-emerald-500/35 text-emerald-700 dark:text-emerald-300' }
}

function countLabel(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`
}

type Props = {
  settings: DivineManagerSettingsRow
  mode: DivineManagerMode
  uiMode: EasyProUiMode
  onUiModeChange: (mode: EasyProUiMode) => void
  onModeChange: (mode: DivineManagerMode) => void
  onOpenTextDivine: () => void
  onStartVoice: () => void
  onPause: () => void
  onReset: () => void
  resetting: boolean
  realtimeStatus: string
  sessionPhotoDataUrl: string | null
  onSessionPhotoDataUrlChange: (value: string | null) => void
}

export function DivineManagerCockpit({
  settings,
  mode,
  uiMode,
  onUiModeChange,
  onModeChange,
  onOpenTextDivine,
  onStartVoice,
  onPause,
  onReset,
  resetting,
  realtimeStatus,
  sessionPhotoDataUrl,
  onSessionPhotoDataUrlChange,
}: Props) {
  const [today, setToday] = useState<DivineTodayPlanResponse | null>(null)
  const [loadingToday, setLoadingToday] = useState(true)
  const [todayError, setTodayError] = useState<string | null>(null)
  const { tasks, loading: tasksLoading, error: tasksError, refresh: refreshTasks } = useProtocolTasks()

  const loadToday = useCallback(async () => {
    setLoadingToday(true)
    setTodayError(null)
    try {
      const res = await fetch('/api/divine/today-plan', { credentials: 'include' })
      const json = (await res.json()) as DivineTodayPlanResponse & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load today')
      setToday(json)
    } catch (e) {
      setTodayError(e instanceof Error ? e.message : 'Failed to load today')
      setToday(null)
    } finally {
      setLoadingToday(false)
    }
  }, [])

  useEffect(() => {
    void loadToday()
  }, [loadToday])

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'executing' || t.status === 'failed'),
    [tasks],
  )
  const executingTasks = openTasks.filter((t) => t.status === 'executing').length
  const modeMeta = modeCopy(mode)
  const setup = today?.setup
  const missingSetup = [
    setup && !setup.has_platform_connection ? 'Connect OnlyFans or Fansly' : null,
    setup && !setup.manager_mode_on ? 'Turn Divine Manager on' : null,
    setup && !setup.voice_configured ? 'Choose a voice' : null,
    setup && !setup.beta_acknowledged ? 'Acknowledge beta safety' : null,
  ].filter(Boolean) as string[]
  const setupReady = setup ? missingSetup.length === 0 : settings.beta_acknowledged && mode !== 'off'

  const refreshAll = () => {
    void loadToday()
    void refreshTasks()
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/70 bg-card/70 px-4 py-4 shadow-sm backdrop-blur sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 text-[11px]', modeMeta.tone)}>
                {modeMeta.label}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-normal">
                {settings.manager_archetype || 'hermes'}
              </Badge>
              {setupReady ? (
                <Badge variant="outline" className="rounded-full border-emerald-500/35 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                  Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full border-amber-500/35 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Setup needed
                </Badge>
              )}
            </div>
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-[2.125rem]">
                Divine Manager
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Your daily cockpit for inbox, protection, retention, content, and Divine actions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" className="h-10 rounded-full px-5" onClick={onOpenTextDivine}>
                <MessageCircle className="h-4 w-4" aria-hidden />
                Message Divine
              </Button>
              <Button type="button" variant="outline" className="h-10 rounded-full px-5" onClick={onStartVoice}>
                <Mic className="h-4 w-4" aria-hidden />
                {realtimeStatus === 'connecting' ? 'Connecting...' : realtimeStatus === 'connected' ? 'Voice live' : 'Start voice'}
              </Button>
              {mode !== 'off' ? (
                <Button type="button" variant="ghost" className="h-10 rounded-full px-4" onClick={onPause}>
                  <Pause className="h-4 w-4" aria-hidden />
                  Pause
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <EasyProModeToggle value={uiMode} onChange={onUiModeChange} ariaLabel="Divine Manager layout mode" />
            <div className="inline-flex w-fit rounded-full border border-border/70 bg-background/60 p-1">
              {(['off', 'suggest_only', 'semi_auto'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    mode === m ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'off' ? 'Off' : m === 'suggest_only' ? 'Suggest' : 'Semi-auto'}
                </button>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" disabled={resetting} onClick={onReset} className="w-fit text-muted-foreground">
              {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Settings2 className="h-3.5 w-3.5" aria-hidden />}
              Reset setup
            </Button>
          </div>
        </div>
      </section>

      <Card className={cn('border-border/70', setupReady ? 'bg-card/70' : 'border-amber-500/35 bg-amber-500/[0.04]')}>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', setupReady ? 'text-emerald-600' : 'text-amber-600')} aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">{setupReady ? 'Setup is ready' : 'Finish setup to unlock the daily flow'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {setupReady
                  ? 'Only urgent items and daily decisions are surfaced here.'
                  : missingSetup.length > 0
                    ? missingSetup.join(' / ')
                    : 'Loading setup status...'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/settings">Platforms</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/ai-studio?tab=tools">AI Studio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card id="divine-section-today-plan" className="border-purple-500/15">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-purple-500" aria-hidden />
                  Today Command Center
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">One place for the work that needs your attention now.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="w-fit gap-1" onClick={refreshAll}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayError || tasksError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {todayError || tasksError}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile
                icon={<Bell className="h-4 w-4" />}
                label="Inbox"
                value={today?.inbox.notifications_unread ?? 0}
                detail={today ? `${today.inbox.divine_notifications_unread} Divine-tab` : 'Loading'}
                href="/dashboard"
              />
              <MetricTile
                icon={<Shield className="h-4 w-4" />}
                label="Protection"
                value={today?.protection.open_leak_alerts ?? 0}
                detail="Open leak alerts"
                href="/dashboard/protection"
              />
              <MetricTile
                icon={<Activity className="h-4 w-4" />}
                label="Retention"
                value={today?.retention.high_risk_churn_snapshots ?? 0}
                detail={today?.retention.churn_background_enabled ? 'Background on' : 'Background off'}
                href={today?.retention.hub_path ?? '/dashboard/retention/churn'}
              />
              <MetricTile
                icon={<CalendarDays className="h-4 w-4" />}
                label="Calendar"
                value={today?.calendar.scheduled_upcoming.length ?? 0}
                detail={today ? countLabel(today.calendar.scheduled_upcoming.length, 'scheduled post') : 'Loading'}
                href="/dashboard/content"
              />
            </div>

            <div id="divine-section-tasks" className="scroll-mt-24 rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Action Queue</p>
                  <p className="text-xs text-muted-foreground">
                    {openTasks.length > 0
                      ? `${countLabel(openTasks.length, 'open item')} ${executingTasks ? `/ ${executingTasks} running` : ''}`
                      : 'No urgent Divine tasks right now.'}
                  </p>
                </div>
                {openTasks.length > 0 ? (
                  <Button type="button" size="sm" variant="secondary" onClick={onOpenTextDivine}>
                    Ask Divine
                  </Button>
                ) : null}
              </div>
              <div className="mt-3">
                {tasksLoading && openTasks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading tasks...</p>
                ) : openTasks.length > 0 ? (
                  <ProtocolOpenTasksListManage tasks={openTasks} textAlign="left" />
                ) : (
                  <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">Clear for now</p>
                    <p className="mt-1 text-xs text-muted-foreground">Inbox, leaks, retention, and content checks will surface here when they need action.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="divine-section-voice" className="border-amber-500/15">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="h-5 w-5 text-amber-500" aria-hidden />
              Voice & photo
            </CardTitle>
            <p className="text-sm text-muted-foreground">Quick actions without opening the full control room.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-background/45 p-3">
              <p className="text-sm font-medium text-foreground">
                {realtimeStatus === 'connected' ? 'Voice is live' : realtimeStatus === 'connecting' ? 'Connecting voice' : 'Ready for a call'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Ask for a briefing, captions, stats, or help finishing the queue.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={onStartVoice}>
                  <Mic className="h-4 w-4" aria-hidden />
                  {realtimeStatus === 'connected' ? 'Keep talking' : 'Start voice'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onOpenTextDivine}>
                  Text instead
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-border p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Upload className="h-4 w-4" aria-hidden />
                Photo context
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Upload one photo, then ask Divine to rate, caption, or plan timing.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  className="max-w-[220px] text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => onSessionPhotoDataUrlChange(String(reader.result ?? ''))
                    reader.readAsDataURL(file)
                  }}
                />
                {sessionPhotoDataUrl ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onSessionPhotoDataUrlChange(null)}>
                    Clear
                  </Button>
                ) : null}
              </div>
              {sessionPhotoDataUrl ? (
                <div className="mt-3 flex items-center gap-2">
                  <img src={sessionPhotoDataUrl} alt="Session upload" className="h-14 w-14 rounded-md border border-border object-cover" />
                  <p className="text-xs text-muted-foreground">Photo ready for your next voice request.</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      {loadingToday ? <p className="text-center text-xs text-muted-foreground">Refreshing Divine cockpit...</p> : null}
    </div>
  )
}

function MetricTile({
  icon,
  label,
  value,
  detail,
  href,
}: {
  icon: ReactNode
  label: string
  value: number
  detail: string
  href: string
}) {
  const active = value > 0
  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border p-3 transition-colors hover:border-foreground/25 hover:bg-muted/30',
        active ? 'border-amber-500/30 bg-amber-500/[0.05]' : 'border-border/70 bg-background/45',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className={active ? 'text-amber-600' : 'text-muted-foreground'}>{icon}</span>
          {label}
        </div>
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Link>
  )
}
