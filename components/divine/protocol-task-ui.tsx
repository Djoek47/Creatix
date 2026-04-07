'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { isLeftoverTask, PRIORITY_TIER_LABELS } from '@/lib/creator-protocol-task-types'
import type { CreatorProtocolPriorityTier } from '@/lib/creator-protocol-task-types'
import type { CreatorProtocolTaskRow } from '@/lib/creator-protocol-task-types'

export function protocolStatusShell(
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

type ProtocolOpenTasksListProps = {
  tasks: CreatorProtocolTaskRow[]
  textAlign?: 'left' | 'right'
  className?: string
}

/** Open protocol tasks (caller filters to pending/executing). */
export function ProtocolOpenTasksList({ tasks, textAlign = 'right', className }: ProtocolOpenTasksListProps) {
  const align = textAlign === 'left' ? 'text-left' : 'text-right'
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {tasks.map((t) => {
        const tier = (t.priority_tier ?? 4) as CreatorProtocolPriorityTier
        const tierLabel = PRIORITY_TIER_LABELS[tier] ?? 'Task'
        const leftover = isLeftoverTask(t.metadata)
        return (
          <div key={t.id}>
            {protocolStatusShell(
              t.status,
              <div className={align}>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">
                  {tierLabel}
                  {leftover ? ' · Leftover' : ''}
                </p>
                <p className="text-xs font-medium leading-tight">{t.title}</p>
                {t.body ? (
                  <p className="mt-0.5 line-clamp-4 text-[10px] text-muted-foreground">{t.body}</p>
                ) : null}
                <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">{t.status}</p>
              </div>,
              { leftover },
            )}
          </div>
        )
      })}
    </div>
  )
}
