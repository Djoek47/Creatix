'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { useDivineProtocolBriefing } from '@/components/divine/use-divine-protocol-briefing'
import { ProtocolOpenTasksList } from '@/components/divine/protocol-task-ui'
import { Sparkles, Loader2, ChevronDown, Layers2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const DISPLAY_LEVEL_KEY = 'divine-protocol-rail-level'

/** 0 = full label, 1 = short “Task & protocol”, 2 = micro dot (purple if idle; gold–violet if open work) */
type DisplayLevel = 0 | 1 | 2

function loadDisplayLevel(): DisplayLevel {
  if (typeof window === 'undefined') return 0
  const v = window.localStorage.getItem(DISPLAY_LEVEL_KEY)
  if (v === '1' || v === '2') return Number(v) as DisplayLevel
  return 0
}

export function DivineProtocolTaskRail() {
  const { tasks, loading, error, refresh } = useProtocolTasks()
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [displayLevel, setDisplayLevel] = useState<DisplayLevel>(0)
  /** True once this session had at least one open task — used to auto-collapse the empty rail. */
  const hadOpenTasksRef = useRef(false)

  useEffect(() => {
    setDisplayLevel(loadDisplayLevel())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DISPLAY_LEVEL_KEY, String(displayLevel))
  }, [displayLevel])

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'executing'),
    [tasks],
  )

  const hasOpenWork = openTasks.length > 0
  /** When the panel is open, always use the full header for clarity. */
  const level: DisplayLevel = menuOpen ? 0 : displayLevel
  const cycleLevel = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDisplayLevel((d) => ((d + 1) % 3) as DisplayLevel)
  }

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

  const triggerMeta = (compact: boolean) => {
    if (showEmptyShell) {
      return <span className={compact ? 'text-[10px] text-muted-foreground' : 'text-[11px] text-muted-foreground'}>— none open</span>
    }
    if (hasOpenWork) {
      return (
        <span className={cn('text-muted-foreground tabular-nums', compact ? 'text-[10px]' : 'text-[11px]')}>
          {openTasks.length} open
        </span>
      )
    }
    if (loading) {
      return <span className="text-[10px] text-muted-foreground">Loading…</span>
    }
    return null
  }

  /** Empty + collapsed: same three header sizes as the main rail (no open tasks → tiny dot is purple). */
  if (showEmptyShell && !menuOpen) {
    const lv = displayLevel
    return (
      <div className="divine-protocol-stack-shell flex w-fit max-w-[min(92vw,400px)] items-center gap-0.5">
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          onClick={cycleLevel}
          title="Header: large — small — tiny (cycles)"
        >
          <Layers2 className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Cycle header size</span>
        </button>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-between border border-dashed border-amber-500/25 bg-card/70 text-left text-xs backdrop-blur-sm transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40',
            lv === 2 ? 'h-8 min-w-8 rounded-full p-0.5' : 'max-w-full gap-2 rounded-lg px-3 py-2',
            lv === 1 && 'gap-1.5 py-1.5',
          )}
          onClick={() => setMenuOpen(true)}
          aria-label={
            lv === 2
              ? 'Protocols and tasks — no open work'
              : 'Open protocols and tasks panel, none open'
          }
        >
          {lv === 2 ? (
            <span
              className="mx-auto block h-2.5 w-2.5 rounded-full bg-circe shadow-[0_0_8px_rgba(147,51,234,0.45)]"
              aria-hidden
            />
          ) : lv === 1 ? (
            <>
              <span className="font-medium text-foreground">Task &amp; protocol</span>
              {triggerMeta(true)}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">Protocols &amp; tasks</span>
              <span className="text-[11px] text-muted-foreground">Show panel</span>
            </>
          )}
        </button>
      </div>
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
        <div className="flex min-h-7 items-center justify-end gap-0.5 px-2 pt-1">
          <button
            type="button"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            onClick={cycleLevel}
            title="Header: large — small — tiny (cycles)"
          >
            <Layers2 className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Cycle header size</span>
          </button>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40',
                level === 2
                  ? 'inline-flex min-h-8 min-w-8 items-center justify-center rounded-full p-0.5 hover:bg-muted/35'
                  : 'inline-flex w-fit max-w-full items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-muted/35',
                level === 1 && 'gap-1.5 py-1.5',
              )}
              aria-label={
                level === 2
                  ? hasOpenWork
                    ? `Protocols and tasks, ${openTasks.length} open`
                    : 'Protocols and tasks, no open items'
                  : undefined
              }
            >
              {level === 2 ? (
                hasOpenWork ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-300 via-fuchsia-500 to-violet-600 bg-[length:200%_200%] animate-gradient-x shadow-[0_0_10px_rgba(192,38,211,0.5)]"
                    aria-hidden
                  />
                ) : (
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-circe shadow-[0_0_8px_rgba(147,51,234,0.45)]"
                    aria-hidden
                  />
                )
              ) : (
                <>
                  <ChevronDown
                    className={cn(
                      'shrink-0 text-muted-foreground transition-transform duration-200',
                      level === 1 ? 'h-3.5 w-3.5' : 'h-4 w-4',
                      menuOpen ? 'rotate-0' : '-rotate-90',
                    )}
                    aria-hidden
                  />
                  {level === 1 ? (
                    <>
                      <span className="text-xs font-medium">Task &amp; protocol</span>
                      {triggerMeta(true)}
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium">Protocols &amp; tasks</span>
                      {triggerMeta(false)}
                    </>
                  )}
                </>
              )}
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
