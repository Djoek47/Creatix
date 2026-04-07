'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { useDivineProtocolBriefing } from '@/components/divine/use-divine-protocol-briefing'
import { ProtocolOpenTasksList } from '@/components/divine/protocol-task-ui'
import { Sparkles, Loader2, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function DivineProtocolTaskRail() {
  const { tasks, loading, error, refresh } = useProtocolTasks()
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const [menuOpen, setMenuOpen] = useState(false)
  /** True once this session had at least one open task — used to auto-collapse the empty rail. */
  const hadOpenTasksRef = useRef(false)

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'executing'),
    [tasks],
  )

  const { runBriefingUnified, briefingLoading, briefingHint } = useDivineProtocolBriefing(
    openTasks,
    divinePanel,
    voiceSession,
  )

  const showEmptyShell = !openTasks.length && !loading && !error

  useEffect(() => {
    if (openTasks.length > 0) {
      hadOpenTasksRef.current = true
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
        className="divine-protocol-stack-shell inline-flex w-fit max-w-[min(92vw,400px)] items-center justify-between gap-2 rounded-lg border border-dashed border-amber-500/25 bg-card/70 px-3 py-2 text-left text-xs backdrop-blur-sm transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
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
        'divine-protocol-stack-shell overflow-hidden rounded-lg backdrop-blur-sm',
        menuOpen && !showEmptyShell ? 'w-[min(92vw,400px)]' : 'w-fit max-w-[min(92vw,400px)]',
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
        <div className="flex justify-end px-2 pt-1">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex w-fit max-w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
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
                <span className="text-[10px] text-muted-foreground tabular-nums">{openTasks.length} open</span>
              ) : loading ? (
                <span className="text-[10px] text-muted-foreground">Loading…</span>
              ) : null}
            </button>
          </CollapsibleTrigger>
        </div>
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
                    <ProtocolOpenTasksList tasks={openTasks} textAlign="right" />
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
