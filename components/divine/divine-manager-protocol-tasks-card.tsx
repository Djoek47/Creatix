'use client'

import { useMemo } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { useDivineProtocolBriefing } from '@/components/divine/use-divine-protocol-briefing'
import { ProtocolOpenTasksListManage } from '@/components/divine/protocol-task-ui'

/** Main Divine Manager section: same protocol queue as the floating crown panel (notifications, scans, tool follow-ups). */
export function DivineManagerProtocolTasksCard() {
  const { tasks, loading, error, refresh } = useProtocolTasks()
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'executing'),
    [tasks],
  )
  const { runBriefingUnified, briefingLoading, briefingHint } = useDivineProtocolBriefing(
    openTasks,
    divinePanel,
    voiceSession,
  )

  return (
    <Card id="divine-section-tasks" className="divine-card scroll-mt-24 border-amber-500/15">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0" aria-hidden />
              Protocols &amp; tasks
            </CardTitle>
            <CardDescription>
              Follow-ups from notifications, scans, and your workspace tools. The same queue appears in the floating
              assistant menu.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1 justify-end shrink-0">
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1 text-xs"
              disabled={briefingLoading}
              onClick={() => void runBriefingUnified()}
            >
              {briefingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Realtime briefing
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {briefingHint ? (
          <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/20 px-3 py-2">{briefingHint}</p>
        ) : null}
        {error ? (
          <p className="text-xs text-destructive">Could not load protocol tasks ({error}).</p>
        ) : null}
        {loading && !openTasks.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center rounded-lg border border-dashed border-amber-500/20 bg-muted/10 px-4">
            Nothing open right now. Steps show up when something needs you, or after you run Realtime briefing.
          </p>
        ) : (
          <ScrollArea className="max-h-[min(60vh,520px)] pr-3">
            <ProtocolOpenTasksListManage tasks={openTasks} textAlign="left" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
