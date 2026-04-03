'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import {
  CRM_NOTIFICATION_ID_RE,
  type NotificationBriefingItem,
} from '@/lib/notification-briefing-types'
import { Sparkles, Loader2 } from 'lucide-react'

function statusShell(status: string, children: ReactNode) {
  const executing = status === 'executing'
  const done = status === 'done'
  const failed = status === 'failed'

  if (executing) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-violet-500 via-amber-400 to-violet-600 p-px shadow-sm animate-pulse">
        <div className="rounded-[7px] border border-transparent bg-card/95 px-2.5 py-2">{children}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2',
        done && 'border-emerald-500/50 bg-emerald-500/10',
        failed && 'border-red-500/50 bg-red-500/10',
        !done && !failed && 'border-border bg-card/90',
      )}
    >
      {children}
    </div>
  )
}

export function DivineProtocolTaskRail() {
  const { tasks, loading, error, refresh } = useProtocolTasks()
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefingHint, setBriefingHint] = useState<string | null>(null)

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'executing'),
    [tasks],
  )

  const runBriefingForQueue = useCallback(async () => {
    setBriefingLoading(true)
    setBriefingHint(null)
    try {
      const unreadIds = openTasks
        .map((t) => t.linked_notification_id)
        .filter((id): id is string => Boolean(id && CRM_NOTIFICATION_ID_RE.test(id)))
        .slice(0, 25)

      if (unreadIds.length === 0) {
        setBriefingHint('No open tasks with linked CRM notifications. Add tasks from Divine or link a notification id.')
        return
      }

      const res = await fetch('/api/divine/notification-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notification_ids: unreadIds }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBriefingHint(typeof json.error === 'string' ? json.error : 'Briefing failed')
        return
      }
      const script = typeof json.script === 'string' ? json.script : ''
      const items = Array.isArray(json.items)
        ? (json.items as NotificationBriefingItem[]).filter(
            (it) => it && typeof it.notification_id === 'string',
          )
        : []
      if (items.length === 0) {
        setBriefingHint(script.trim() || 'No briefing items returned.')
        return
      }

      const linksById: Record<string, string | undefined> = {}
      const linkIds = [...new Set(items.map((it) => it.notification_id).filter(Boolean))]
      if (linkIds.length > 0) {
        const sb = createClient()
        const { data: rows } = await sb.from('notifications').select('id, link').in('id', linkIds)
        for (const r of rows ?? []) {
          const row = r as { id: string; link?: string | null }
          if (row.link) linksById[row.id] = row.link
        }
      }

      divinePanel?.openSecretaryFromBriefing({ script, items, linksById })

      const lines = items.slice(0, 20).map(
        (it, i) =>
          `${i + 1}. [${it.notification_id}] ${it.summary} — ${it.suggested_action}`.slice(0, 400),
      )

      try {
        if (voiceSession?.status === 'connected') {
          await voiceSession.sendBriefingQuestion(
            `Notification secretary (voice live). Task-linked queue:\n${lines.join('\n')}\n\nStart with item 1. Use secretary_next_notification only after the creator confirms. Use notifications_panel to open the bell if needed.`,
          )
        } else if (voiceSession && voiceSession.status !== 'connecting') {
          await voiceSession.startVoiceCall({
            realtimeBodyExtras: {
              mode: 'notification_secretary',
              notification_secretary: { lines },
            },
          })
          await new Promise((r) => setTimeout(r, 150))
          try {
            await voiceSession.sendBriefingQuestion(
              `Walking through ${items.length} task-linked notifications. Start with the first; use secretary_next_notification after confirmation.`,
            )
          } catch {
            // channel may still be opening
          }
        }
      } catch {
        // voice optional
      }
    } catch {
      setBriefingHint('Briefing failed')
    } finally {
      setBriefingLoading(false)
    }
  }, [openTasks, divinePanel, voiceSession])

  if (!openTasks.length && !loading && !error) {
    return (
      <div className="divine-protocol-stack-shell w-[min(92vw,660px)] rounded-lg border border-dashed border-amber-500/20 bg-card/60 px-3 py-2 text-right backdrop-blur-sm">
        <div className="flex flex-col items-end gap-1">
          <p className="text-[11px] text-muted-foreground">Protocol tasks — none open</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            disabled={briefingLoading || !divinePanel}
            onClick={() => void runBriefingForQueue()}
          >
            {briefingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI briefing (linked)
          </Button>
          {briefingHint ? <p className="max-w-[280px] text-[10px] text-muted-foreground">{briefingHint}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'divine-protocol-stack-shell flex max-h-[min(40vh,320px)] w-[min(92vw,660px)] flex-col rounded-lg border border-amber-500/15 bg-card/95 shadow-md backdrop-blur-sm',
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-amber-500/10 px-3 py-2">
        <span className="text-xs font-medium">Protocols & tasks</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            disabled={briefingLoading || !divinePanel}
            onClick={() => void runBriefingForQueue()}
          >
            {briefingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Briefing
          </Button>
        </div>
      </div>
      {briefingHint ? (
        <p className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">{briefingHint}</p>
      ) : null}
      {error ? (
        <p className="px-3 py-2 text-[10px] text-destructive">Could not load tasks ({error}). Run DB migration 046.</p>
      ) : null}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 p-2">
          {loading && !openTasks.length ? (
            <p className="px-1 text-center text-[11px] text-muted-foreground">Loading…</p>
          ) : (
            openTasks.map((t) => (
              <div key={t.id}>{statusShell(t.status, (
                <div className="text-right">
                  <p className="text-xs font-medium leading-tight">{t.title}</p>
                  {t.body ? (
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{t.body}</p>
                  ) : null}
                  <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">{t.status}</p>
                </div>
              ))}</div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
