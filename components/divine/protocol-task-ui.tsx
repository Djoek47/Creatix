'use client'

import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isLeftoverTask, PRIORITY_TIER_LABELS } from '@/lib/creator-protocol-task-types'
import type { CreatorProtocolPriorityTier } from '@/lib/creator-protocol-task-types'
import type { CreatorProtocolTaskRow } from '@/lib/creator-protocol-task-types'
import { dispatchNotificationPanelAction } from '@/lib/dashboard/notification-ui-bridge'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'

export function protocolStatusShell(
  status: string,
  children: ReactNode,
  options?: { leftover?: boolean; railBodyFlip?: boolean },
) {
  const executing = status === 'executing'
  const done = status === 'done'
  const failed = status === 'failed'
  const leftover = options?.leftover === true && !done && !executing
  const rail = options?.railBodyFlip === true

  if (executing) {
    return (
      <div
        className={cn(
          'rounded-lg p-px shadow-sm animate-pulse',
          rail
            ? 'bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-400 dark:from-amber-400 dark:via-violet-500 dark:to-fuchsia-500'
            : 'bg-gradient-to-r from-violet-500 via-amber-400 to-violet-600',
        )}
      >
        <div className="rounded-[7px] border border-transparent bg-card/95 px-2.5 py-2 backdrop-blur-sm dark:bg-card/90">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2 backdrop-blur-sm',
        done && 'border-emerald-500/50 bg-emerald-500/10',
        failed && 'border-red-500/50 bg-red-500/10',
        leftover &&
          (rail
            ? 'border-violet-400/40 bg-violet-500/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-amber-400/45 dark:bg-amber-500/[0.11] dark:shadow-none'
            : 'border-amber-500/45 bg-amber-500/[0.08]'),
        !done &&
          !failed &&
          !leftover &&
          (rail
            ? 'border-amber-200/50 bg-white/[0.55] dark:border-violet-400/25 dark:bg-violet-500/[0.07]'
            : 'border-border bg-card/90'),
      )}
    >
      {children}
    </div>
  )
}

type ListLayoutProps = {
  tasks: CreatorProtocolTaskRow[]
  textAlign?: 'left' | 'right'
  className?: string
  /** Floating rail only: body vs header accent flip (light vs dark). */
  railBodyFlip?: boolean
}

function protocolTaskTextBlock(t: CreatorProtocolTaskRow, alignClass: string, actions: ReactNode | null) {
  const tier = (t.priority_tier ?? 4) as CreatorProtocolPriorityTier
  const tierLabel = PRIORITY_TIER_LABELS[tier] ?? 'Task'
  const leftover = isLeftoverTask(t.metadata)
  return (
    <div className={alignClass}>
      <p className="mb-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
        {tierLabel}
        {leftover ? ' · Leftover' : ''}
      </p>
      <p className="text-xs font-medium leading-tight">{t.title}</p>
      {t.body ? (
        <p className="mt-0.5 whitespace-pre-wrap text-[10px] leading-snug text-muted-foreground">{t.body}</p>
      ) : null}
      <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">{t.status}</p>
      {actions}
    </div>
  )
}

/**
 * Read-only task queue for the floating protocols rail / FAB.
 * Completing tasks happens only on Divine Manager ({@link ProtocolOpenTasksListManage}).
 */
export function ProtocolOpenTasksListPeek({
  tasks,
  textAlign = 'right',
  className,
  railBodyFlip = false,
}: ListLayoutProps) {
  const alignClass = textAlign === 'left' ? 'text-left' : 'text-right'
  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      aria-label="Open protocol tasks (read-only; complete on Divine Manager)"
      data-protocol-task-mode="peek"
    >
      {tasks.map((t) => {
        const leftover = isLeftoverTask(t.metadata)
        return (
          <div key={t.id}>
            {protocolStatusShell(t.status, protocolTaskTextBlock(t, alignClass, null), {
              leftover,
              railBodyFlip,
            })}
          </div>
        )
      })}
      {tasks.length > 0 ? (
        <p
          className={cn(
            'pt-1 text-[10px] leading-snug text-muted-foreground',
            textAlign === 'left' ? 'text-left' : 'text-right',
          )}
        >
          <Link
            href="/dashboard/divine-manager#divine-section-tasks"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            Finish or dismiss on Divine Manager →
          </Link>
        </p>
      ) : null}
    </div>
  )
}

/** Divine Manager only: complete tasks and open linked inbox rows. */
export function ProtocolOpenTasksListManage({ tasks, textAlign = 'left', className }: ListLayoutProps) {
  const { refresh } = useProtocolTasks()
  const [busyId, setBusyId] = useState<string | null>(null)
  const alignClass = textAlign === 'left' ? 'text-left' : 'text-right'
  const actionsJustify = textAlign === 'left' ? 'justify-start' : 'justify-end'

  const markDone = useCallback(
    async (taskId: string) => {
      setBusyId(taskId)
      try {
        const sb = createClient()
        const { error } = await sb
          .from('creator_protocol_tasks')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', taskId)
          .in('status', ['pending', 'executing'])
        if (error) console.error('[protocol-task] mark done', error)
        await refresh()
      } finally {
        setBusyId(null)
      }
    },
    [refresh],
  )

  const openLinkedNotification = useCallback((notificationId: string) => {
    dispatchNotificationPanelAction({
      open: true,
      tab: 'divine',
      scrollToId: notificationId,
    })
  }, [])

  return (
    <div className={cn('flex flex-col gap-2', className)} data-protocol-task-mode="manage">
      {tasks.map((t) => {
        const leftover = isLeftoverTask(t.metadata)
        const actions = (
          <div className={cn('mt-2 flex flex-wrap items-center gap-2', actionsJustify)}>
            {t.linked_notification_id ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-normal text-muted-foreground hover:text-foreground"
                onClick={() => openLinkedNotification(t.linked_notification_id!)}
              >
                Open in inbox
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 rounded-lg px-2.5 text-[10px] font-medium"
              disabled={busyId === t.id}
              onClick={() => void markDone(t.id)}
            >
              {busyId === t.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : 'Done'}
            </Button>
          </div>
        )
        return (
          <div key={t.id}>
            {protocolStatusShell(t.status, protocolTaskTextBlock(t, alignClass, actions), { leftover })}
          </div>
        )
      })}
    </div>
  )
}

ProtocolOpenTasksListPeek.displayName = 'ProtocolOpenTasksListPeek'
ProtocolOpenTasksListManage.displayName = 'ProtocolOpenTasksListManage'
