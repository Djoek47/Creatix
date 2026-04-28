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

/** 0 = full “Protocols & tasks” label, 1 = micro dot only (no middle “Task & protocol” step) */
type DisplayLevel = 0 | 1

function loadDisplayLevel(): DisplayLevel {
  if (typeof window === 'undefined') return 0
  const v = window.localStorage.getItem(DISPLAY_LEVEL_KEY)
  if (v === '1') return 1
  /* legacy: old middle step "1" dropped; old tiny "2" → still tiny */
  if (v === '2') return 1
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
  const onHeaderSizeButtonClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    setDisplayLevel((d) => ((d + 1) % 2) as DisplayLevel)
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
      return (
        <span className={cn('text-muted-foreground/80 tabular-nums', compact ? 'text-[11px]' : 'text-[12px]')}>
          None open
        </span>
      )
    }
    if (hasOpenWork) {
      return (
        <span className={cn('text-muted-foreground/85 tabular-nums', compact ? 'text-[11px]' : 'text-[12px]')}>
          {openTasks.length} open
        </span>
      )
    }
    if (loading) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/75">
          <Loader2 className="h-3 w-3 animate-spin opacity-70" aria-hidden />
          Loading
        </span>
      )
    }
    return null
  }

  /** Empty + collapsed: two header sizes only — full label or micro dot (no open tasks → dot is purple). */
  if (showEmptyShell && !menuOpen) {
    const lv = displayLevel
    return (
      <div className="divine-protocol-stack-shell flex w-fit max-w-[min(92vw,400px)] items-center gap-1">
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-muted/50 hover:text-foreground"
          onClick={onHeaderSizeButtonClick}
          title="Compact header — full header (cycles)"
        >
          <Layers2 className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Cycle header size</span>
        </button>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-between border border-border/50 bg-card/85 text-left shadow-sm backdrop-blur-xl transition-colors duration-200 hover:bg-card/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
            lv === 1 ? 'h-9 min-w-9 rounded-full p-0' : 'max-w-full gap-3 rounded-2xl px-4 py-2.5',
          )}
          onClick={() => setMenuOpen(true)}
          aria-label={lv === 1 ? 'Protocols and tasks — no open work' : 'Open protocols and tasks panel, none open'}
        >
          {lv === 1 ? (
            <span
              className="mx-auto block h-2 w-2 rounded-full bg-muted-foreground/35 ring-1 ring-border/60"
              aria-hidden
            />
          ) : (
            <>
              <span className="text-[13px] font-semibold tracking-tight text-foreground">Protocols &amp; tasks</span>
              <span className="text-[12px] text-muted-foreground/80">Open</span>
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'divine-protocol-stack-shell overflow-hidden rounded-2xl border border-border/50 bg-card/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)]',
        menuOpen && !showEmptyShell ? 'w-[min(92vw,400px)]' : 'w-fit max-w-[min(92vw,400px)]',
        showEmptyShell ? 'border-dashed border-border/45 bg-card/75' : 'flex max-h-[min(40vh,320px)] flex-col',
      )}
    >
      <Collapsible
        open={menuOpen}
        onOpenChange={setMenuOpen}
        className={cn(!showEmptyShell && 'flex min-h-0 flex-1 flex-col overflow-hidden')}
      >
        <div
          className={cn(
            'flex min-h-9 items-center gap-1 pt-3',
            level === 1 && !menuOpen ? 'justify-center px-2' : 'justify-end px-3',
          )}
        >
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-muted/45 hover:text-foreground"
            onClick={onHeaderSizeButtonClick}
            title={menuOpen ? 'Collapse panel' : 'Compact header — full header (cycles)'}
          >
            <Layers2 className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{menuOpen ? 'Collapse protocols panel' : 'Cycle header size'}</span>
          </button>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
                level === 1
                  ? 'inline-flex min-h-9 min-w-9 items-center justify-center rounded-full hover:bg-muted/40'
                  : 'inline-flex w-fit max-w-full items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/35',
              )}
              aria-label={
                level === 1
                  ? hasOpenWork
                    ? `Protocols and tasks, ${openTasks.length} open`
                    : 'Protocols and tasks, no open items'
                  : undefined
              }
            >
              {level === 1 ? (
                hasOpenWork ? (
                  <span
                    className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/25 dark:bg-venus dark:ring-venus/25"
                    aria-hidden
                  />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/35 ring-1 ring-border/50" aria-hidden />
                )
              ) : (
                <>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground/80 transition-transform duration-200 ease-out',
                      menuOpen ? 'rotate-0' : '-rotate-90',
                    )}
                    aria-hidden
                  />
                  <span className="text-[13px] font-semibold tracking-tight text-foreground">Protocols &amp; tasks</span>
                  {triggerMeta(false)}
                </>
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent
          className={cn(!showEmptyShell && 'min-h-0 flex-1 overflow-hidden data-[state=open]:flex data-[state=open]:flex-col')}
        >
          {showEmptyShell ? (
            <div className="flex flex-col items-stretch gap-3 px-4 pb-4 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-9 w-full justify-center gap-2 rounded-xl bg-foreground text-[13px] font-medium text-background shadow-none transition-opacity hover:bg-foreground/88 disabled:opacity-45"
                disabled={briefingLoading}
                onClick={() => void runBriefingUnified()}
              >
                {briefingLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 opacity-90" aria-hidden />
                )}
                Realtime briefing
              </Button>
              {briefingHint ? (
                <p className="text-[12px] leading-relaxed text-muted-foreground/85">{briefingHint}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-shrink-0 items-center justify-end gap-2 border-b border-border/40 px-4 pb-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => void refresh()}
                >
                  Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-2 rounded-xl bg-foreground px-3.5 text-[12px] font-medium text-background shadow-none hover:bg-foreground/88 disabled:opacity-45"
                  disabled={briefingLoading}
                  onClick={() => void runBriefingUnified()}
                >
                  {briefingLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 opacity-90" aria-hidden />
                  )}
                  Realtime briefing
                </Button>
              </div>
              {briefingHint ? (
                <p className="border-b border-border/35 px-4 py-2.5 text-[12px] leading-snug text-muted-foreground/85">
                  {briefingHint}
                </p>
              ) : null}
              {error ? (
                <p className="px-4 py-3 text-[12px] text-destructive">
                  Could not load tasks ({error}). Run DB migration 046.
                </p>
              ) : null}
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-2 p-3">
                  {loading && !openTasks.length ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" aria-hidden />
                      <p className="text-[12px] text-muted-foreground/75">Loading tasks</p>
                    </div>
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
