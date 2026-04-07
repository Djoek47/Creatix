'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Bell, CalendarDays, CheckCircle2, Circle, Shield, Sparkles, ListTodo, ChevronDown } from 'lucide-react'
import type { DivineTodayPlanResponse } from '@/lib/divine/today-plan-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { PRIORITY_TIER_LABELS } from '@/lib/creator-protocol-task-types'
import type { CreatorProtocolPriorityTier } from '@/lib/creator-protocol-task-types'

function TaskPlanRowInner({
  t,
  tierLabel,
}: {
  t: {
    title: string
    body: string | null
    status: string
    leftover: boolean
    metadata: Record<string, unknown>
  }
  tierLabel: string
}) {
  const sw = t.metadata?.suggested_post_window
  return (
    <div className="flex flex-wrap gap-2 items-start">
      <Badge variant="outline" className="text-[10px] shrink-0">
        {t.status}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {tierLabel}
          {t.leftover ? ' · Leftover' : ''}
        </p>
        <p className="font-medium text-foreground">{t.title}</p>
        {t.body ? <p className="text-muted-foreground mt-0.5 line-clamp-2">{t.body}</p> : null}
        {typeof sw === 'string' && sw.trim() ? (
          <p className="text-[10px] text-purple-600/90 mt-1">Visibility: {sw}</p>
        ) : null}
      </div>
    </div>
  )
}

function StepRow({
  done,
  label,
  detail,
}: {
  done: boolean
  label: string
  detail?: string
}) {
  return (
    <div className="flex gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" aria-hidden />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
      )}
      <div>
        <span className={cn(done ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
        {detail ? <p className="text-xs text-muted-foreground mt-0.5">{detail}</p> : null}
      </div>
    </div>
  )
}

export function DivineWorkflowTodayPlan({
  onOpenTextDivine,
}: {
  onOpenTextDivine: () => void
}) {
  const [data, setData] = useState<DivineTodayPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workflowOpen, setWorkflowOpen] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/divine/today-plan', { credentials: 'include' })
      const json = (await res.json()) as DivineTodayPlanResponse & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json as DivineTodayPlanResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const s = data?.setup

  return (
    <div className="space-y-6">
      <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <Card className="divine-card border-amber-500/15">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
                    How Divine fits your day
                  </CardTitle>
                  <CardDescription>
                    Setup once → morning triage → content block → come back to protocol and pings.
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', workflowOpen && 'rotate-180')}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="text-foreground font-medium">Guided setup</span> — connect platforms, pick mode, voice,
                  and beta acknowledgement.
                </li>
                <li>
                  <span className="text-foreground font-medium">Morning</span> —                   scan Today&apos;s Plan: inbox, leaks,
                  retention, calendar.
                </li>
                <li>
                  <span className="text-foreground font-medium">Deep work</span> — create content; use the crown for voice
                  or open text chat when you need tools.
                </li>
                <li>
                  <span className="text-foreground font-medium">Afternoon / evening</span> — finish Today&apos;s Plan
                  protocol tasks (tier order); clear Divine notifications if needed.
                </li>
              </ol>
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Setup checklist</p>
                {loading && !s ? (
                  <p className="text-xs text-muted-foreground">Loading status…</p>
                ) : s ? (
                  <div className="space-y-2">
                    <StepRow
                      done={s.has_platform_connection}
                      label="Platform connected"
                      detail="Link OnlyFans or Fansly so Divine can see fans and content."
                    />
                    <StepRow
                      done={s.manager_mode_on}
                      label="Divine Manager is on"
                      detail="Mode is not “off” (suggest-only or semi-auto)."
                    />
                    <StepRow
                      done={s.voice_configured}
                      label="Voice chosen"
                      detail="Pick an AI voice under Your preferences (applies on the next call)."
                    />
                    <StepRow
                      done={s.beta_acknowledged}
                      label="Beta acknowledged"
                      detail="Required once in the setup wizard."
                    />
                    <StepRow
                      done={s.protocol_task_count > 0}
                      label="Protocol tasks"
                      detail="Use the floating rail or ask Divine to add tasks — optional but powerful."
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/settings">Connect platforms</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/ai-studio/chatter">AI Chatter & automations</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/analytics/income-predictor">Income Predictor</Link>
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-amber-600/90 to-purple-600/90 text-white" type="button" onClick={onOpenTextDivine}>
                    Open text Divine
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card id="divine-section-today-plan" className="divine-card scroll-mt-24 border-purple-500/15">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-purple-500" aria-hidden />
            Today&apos;s Plan
          </CardTitle>
          <CardDescription>
            Inbox, protection, retention, calendar, and one ordered protocol list (notifications → DMs → protection →
            content). Leftovers from yesterday roll forward until done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {loading && !data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Bell className="h-4 w-4 text-amber-600" aria-hidden />
                    Inbox
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{data.inbox.notifications_unread}</p>
                  <p className="text-xs text-muted-foreground">
                    Unread in-app · {data.inbox.divine_notifications_unread} Divine-tab
                  </p>
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link href="/dashboard">Open dashboard / notifications</Link>
                  </Button>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-violet-600" aria-hidden />
                    Protection &amp; DMCA
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{data.protection.open_leak_alerts}</p>
                  <p className="text-xs text-muted-foreground">Open leak alerts (detected)</p>
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link href="/dashboard/protection">Open Protection</Link>
                  </Button>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-amber-600" aria-hidden />
                    Retention
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {data.retention?.high_risk_churn_snapshots ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    High/critical churn signals in CRM · background{' '}
                    {data.retention?.churn_background_enabled ? 'on' : 'off'}
                  </p>
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link href={data.retention?.hub_path ?? '/dashboard/retention/churn'}>Retention hub</Link>
                  </Button>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-1 sm:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-4 w-4 text-purple-600" aria-hidden />
                    Content calendar
                  </div>
                  {data.calendar.scheduled_upcoming.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No scheduled posts in the queue.</p>
                  ) : (
                    <ul className="text-xs space-y-1 mt-2">
                      {data.calendar.scheduled_upcoming.map((c) => (
                        <li key={c.id} className="flex flex-wrap gap-2 justify-between border-b border-border/60 pb-1 last:border-0">
                          <span className="font-medium text-foreground truncate">{c.title || 'Untitled'}</span>
                          <span className="text-muted-foreground shrink-0">
                            {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : 'Scheduled'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button variant="link" className="h-auto p-0 text-xs mt-1" asChild>
                    <Link href="/dashboard/content">Manage content</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-amber-500/15 bg-card/40 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Today&apos;s Plan — protocol (
                    {data.plan_tasks.filter((t) => t.status === 'pending' || t.status === 'executing').length} open)
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px] bg-gradient-to-r from-amber-600/85 to-purple-600/85 text-white border-0"
                    type="button"
                    onClick={onOpenTextDivine}
                  >
                    Run Divine
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Same list as the floating rail. Green when done, gold/purple pulse when executing, amber tint for
                  leftovers.
                </p>
                {data.plan_tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No tasks for today yet. Ask Divine to build your plan or add items from the rail.
                  </p>
                ) : (
                  <ul className="text-xs space-y-2">
                    {data.plan_tasks.map((t) => {
                      const tier = Math.min(4, Math.max(1, t.priority_tier)) as CreatorProtocolPriorityTier
                      const tierLabel = PRIORITY_TIER_LABELS[tier]
                      const done = t.status === 'done'
                      const executing = t.status === 'executing'
                      const failed = t.status === 'failed'
                      const leftover = t.leftover && !done && !executing
                      return (
                        <li
                          key={t.id}
                          className={cn(
                            'rounded-md border px-2.5 py-2',
                            done && 'border-emerald-500/50 bg-emerald-500/10',
                            failed && 'border-red-500/40 bg-red-500/10',
                            executing &&
                              'border-transparent bg-gradient-to-r from-violet-500 via-amber-400 to-violet-600 p-px shadow-sm',
                            leftover && 'border-amber-500/45 bg-amber-500/[0.08]',
                            !done && !failed && !executing && !leftover && 'border-border bg-card/80',
                          )}
                        >
                          {executing ? (
                            <div className="rounded-[5px] bg-card/95 px-1.5 py-1.5 -m-px">
                              <TaskPlanRowInner t={t} tierLabel={tierLabel} />
                            </div>
                          ) : (
                            <TaskPlanRowInner t={t} tierLabel={tierLabel} />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/divine-manager#divine-section-today-plan">Divine Manager</Link>
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Refresh plan
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
