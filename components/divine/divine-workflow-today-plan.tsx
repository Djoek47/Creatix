'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CalendarDays, CheckCircle2, Circle, Shield, Sparkles, ListTodo, ChevronDown } from 'lucide-react'
import type { DivineTodayPlanResponse } from '@/lib/divine/today-plan-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

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
                  <span className="text-foreground font-medium">Morning</span> — scan Today&apos;s Plan: inbox, leaks,
                  calendar.
                </li>
                <li>
                  <span className="text-foreground font-medium">Deep work</span> — create content; use the crown for voice
                  or open text chat when you need tools.
                </li>
                <li>
                  <span className="text-foreground font-medium">Afternoon / evening</span> — finish protocol tasks and
                  manager suggestions; clear Divine notifications if needed.
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
            One place for inbox, protection, calendar, protocol, and Divine suggestions — then go make content.
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
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium mb-2">Protocol ({data.protocol.open_count} open)</p>
                {data.protocol.open_tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No open protocol tasks. Check the floating rail.</p>
                ) : (
                  <ul className="text-xs space-y-1">
                    {data.protocol.open_tasks.slice(0, 6).map((t) => (
                      <li key={t.id} className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {t.status}
                        </Badge>
                        <span className="text-muted-foreground">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="link" className="h-auto p-0 text-xs mt-2" asChild>
                  <Link href="/dashboard/divine-manager#divine-section-tasks">Jump to manager tasks</Link>
                </Button>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium mb-2">Divine suggestions</p>
                {data.suggestions.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No suggested or scheduled manager tasks right now.</p>
                ) : (
                  <ul className="text-xs space-y-1">
                    {data.suggestions.items.map((t) => (
                      <li key={t.id} className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {t.status}
                        </Badge>
                        <span>{t.summary}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
