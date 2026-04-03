'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { CRM_NOTIFICATION_ID_RE } from '@/lib/notification-briefing-types'
import { executeNotificationSecretaryBriefing } from '@/lib/divine/notification-secretary-briefing-client'
import { isLeftoverTask, PRIORITY_TIER_LABELS } from '@/lib/creator-protocol-task-types'
import type { CreatorProtocolPriorityTier } from '@/lib/creator-protocol-task-types'
import { Sparkles, Loader2, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

function statusShell(
  status: string,
  children: ReactNode,
  options?: { leftover?: boolean },
) {
  const executing = status === 'executing'
  const done = status === 'done'
  const failed = status === 'failed'
  const leftover = options?.leftover === true && !done && !executing

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
        leftover && 'border-amber-500/45 bg-amber-500/[0.08]',
        !done && !failed && !leftover && 'border-border bg-card/90',
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
  const [menuOpen, setMenuOpen] = useState(true)
  /** True once this session had at least one open task — used to auto-collapse the empty rail. */
  const hadOpenTasksRef = useRef(false)

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'executing'),
    [tasks],
  )

  /** Same secretary + voice flow as the bell; uses task-linked ids when present, else unread saved inbox rows. */
  const runBriefingUnified = useCallback(async () => {
    setBriefingLoading(true)
    setBriefingHint(null)
    try {
      if (!divinePanel) {
        setBriefingHint('Divine is still loading — try again in a moment.')
        return
      }

      const fromTasks = openTasks
        .map((t) => t.linked_notification_id)
        .filter((id): id is string => Boolean(id && CRM_NOTIFICATION_ID_RE.test(id)))

      let notificationIds: string[] = []
      let linksById: Record<string, string | undefined> = {}
      const usedTaskLinks = fromTasks.length > 0

      if (usedTaskLinks) {
        notificationIds = [...new Set(fromTasks)].slice(0, 25)
        if (notificationIds.length > 0) {
          const sb = createClient()
          const { data: rows } = await sb.from('notifications').select('id, link').in('id', notificationIds)
          for (const r of rows ?? []) {
            const row = r as { id: string; link?: string | null }
            if (row.link) linksById[row.id] = row.link
          }
        }
      } else {
        const sb = createClient()
        const {
          data: { user },
        } = await sb.auth.getUser()
        if (!user) {
          setBriefingHint('Sign in to load notifications.')
          return
        }
        const { data: rows } = await sb
          .from('notifications')
          .select('id, link')
          .eq('user_id', user.id)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(60)

        const rawRows = rows ?? []
        for (const r of rawRows) {
          const row = r as { id: string; link?: string | null }
          if (!CRM_NOTIFICATION_ID_RE.test(row.id)) continue
          if (notificationIds.length >= 25) break
          notificationIds.push(row.id)
          if (row.link) linksById[row.id] = row.link
        }

        if (notificationIds.length === 0) {
          const skippedNonCrm = rawRows.filter(
            (r) => !CRM_NOTIFICATION_ID_RE.test((r as { id: string }).id),
          ).length

          if (rawRows.length > 0 && skippedNonCrm === rawRows.length) {
            setBriefingHint(
              'You have unread saved inbox rows, but none use the id format this briefing needs. Open the bell (top right) to review or mark them read.',
            )
            return
          }

          if (rawRows.length === 0) {
            let pullUnreadApprox = 0
            try {
              const [ofRes, fsRes] = await Promise.all([
                fetch('/api/onlyfans/notifications'),
                fetch('/api/fansly/notifications'),
              ])
              const ofJson = await ofRes.json().catch(() => ({}))
              const fsJson = await fsRes.json().catch(() => ({}))
              const ofLen =
                ofRes.ok && !ofJson.error && Array.isArray(ofJson.notifications)
                  ? ofJson.notifications.length
                  : 0
              const fsLen =
                fsRes.ok && !fsJson.error && Array.isArray(fsJson.notifications)
                  ? fsJson.notifications.length
                  : 0
              pullUnreadApprox = ofLen + fsLen
            } catch {
              pullUnreadApprox = 0
            }

            if (pullUnreadApprox > 0) {
              setBriefingHint(
                'The bell count can include live OnlyFans/Fansly alerts that are not saved inbox rows yet. This briefing only uses saved items — open the bell, check the Live tab, then run briefing there or wait until rows sync into your inbox.',
              )
              return
            }
          }

          setBriefingHint(
            'No unread saved notifications yet. Open the bell (top right) so items sync into your inbox, then try again.',
          )
          return
        }
      }

      const result = await executeNotificationSecretaryBriefing({
        notificationIds,
        linksById,
        openSecretaryFromBriefing: divinePanel.openSecretaryFromBriefing,
        voiceSession,
        voicePromptStyle: usedTaskLinks ? 'task_queue' : 'inbox',
      })

      if (!result.ok) {
        setBriefingHint(result.error)
      }
    } catch {
      setBriefingHint('Briefing failed')
    } finally {
      setBriefingLoading(false)
    }
  }, [openTasks, divinePanel, voiceSession])

  const showEmptyShell = !openTasks.length && !loading && !error

  useEffect(() => {
    if (openTasks.length > 0) {
      hadOpenTasksRef.current = true
      setMenuOpen(true)
    }
  }, [openTasks.length])

  useEffect(() => {
    if (showEmptyShell && hadOpenTasksRef.current) {
      setMenuOpen(false)
    }
  }, [showEmptyShell])

  /** Empty + collapsed: keep a compact control so protocol/tasks stay reachable next to the crown. */
  if (showEmptyShell && !menuOpen) {
    return (
      <button
        type="button"
        className="divine-protocol-stack-shell flex w-full max-w-[min(92vw,660px)] items-center justify-between gap-2 rounded-lg border border-dashed border-amber-500/25 bg-card/70 px-3 py-2 text-left text-xs backdrop-blur-sm transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        onClick={() => setMenuOpen(true)}
      >
        <span className="font-medium text-foreground">Protocols &amp; tasks</span>
        <span className="text-[11px] text-muted-foreground">Show panel</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'divine-protocol-stack-shell w-[min(92vw,660px)] overflow-hidden rounded-lg backdrop-blur-sm',
        showEmptyShell
          ? 'border border-dashed border-amber-500/20 bg-card/60'
          : 'flex max-h-[min(40vh,320px)] flex-col border border-amber-500/15 bg-card/95 shadow-md',
      )}
    >
      <Collapsible
        open={menuOpen}
        onOpenChange={setMenuOpen}
        className={cn(!showEmptyShell && 'flex min-h-0 flex-1 flex-col overflow-hidden')}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                menuOpen ? 'rotate-0' : '-rotate-90',
              )}
              aria-hidden
            />
            <span className="text-xs font-medium">Protocols & tasks</span>
            {showEmptyShell ? (
              <span className="text-[11px] text-muted-foreground">— none open</span>
            ) : openTasks.length > 0 ? (
              <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{openTasks.length} open</span>
            ) : loading ? (
              <span className="ml-auto text-[10px] text-muted-foreground">Loading…</span>
            ) : null}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(!showEmptyShell && 'min-h-0 flex-1 overflow-hidden data-[state=open]:flex data-[state=open]:flex-col')}
        >
          {showEmptyShell ? (
            <div className="flex flex-col items-end gap-1 px-3 pb-2 pt-0 text-right">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                disabled={briefingLoading}
                onClick={() => void runBriefingUnified()}
              >
                {briefingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Divine realtime briefing
              </Button>
              {briefingHint ? (
                <p className="max-w-[280px] text-[10px] text-muted-foreground">{briefingHint}</p>
              ) : (
                <p className="max-w-[280px] text-[10px] text-muted-foreground">
                  Same as the bell: human-style voice + secretary panel. New briefings add protocol tasks linked to each
                  notification until you mark them handled. Collapse this bar when empty to hide it completely.
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-shrink-0 items-center justify-end gap-1 border-b border-amber-500/10 px-3 pb-2">
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
                  disabled={briefingLoading}
                  onClick={() => void runBriefingUnified()}
                >
                  {briefingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Realtime briefing
                </Button>
              </div>
              {briefingHint ? (
                <p className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">{briefingHint}</p>
              ) : null}
              {error ? (
                <p className="px-3 py-2 text-[10px] text-destructive">
                  Could not load tasks ({error}). Run DB migration 046.
                </p>
              ) : null}
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-2 p-2">
                  {loading && !openTasks.length ? (
                    <p className="px-1 text-center text-[11px] text-muted-foreground">Loading…</p>
                  ) : (
                    openTasks.map((t) => {
                      const tier = (t.priority_tier ?? 4) as CreatorProtocolPriorityTier
                      const tierLabel = PRIORITY_TIER_LABELS[tier] ?? 'Task'
                      const leftover = isLeftoverTask(t.metadata)
                      return (
                        <div key={t.id}>
                          {statusShell(
                            t.status,
                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">
                                {tierLabel}
                                {leftover ? ' · Leftover' : ''}
                              </p>
                              <p className="text-xs font-medium leading-tight">{t.title}</p>
                              {t.body ? (
                                <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{t.body}</p>
                              ) : null}
                              <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">{t.status}</p>
                            </div>,
                            { leftover },
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
