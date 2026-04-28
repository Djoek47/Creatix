'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { useDivineProtocolBriefing } from '@/components/divine/use-divine-protocol-briefing'
import { ProtocolOpenTasksListPeek } from '@/components/divine/protocol-task-ui'
import { Sparkles, Loader2, ChevronDown, ChevronRight, Layers2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  protocolRailLayersIconClass,
  type ProtocolRailLayersTone,
} from '@/components/divine/use-protocol-rail-layers-accent'

const DISPLAY_LEVEL_KEY = 'divine-protocol-rail-level-v2'
/** Pre–three-tier installs used this key; migrate once */
const LEGACY_DISPLAY_LEVEL_KEY = 'divine-protocol-rail-level'

/**
 * One-time: users who collapsed the rail to tier 2 (“micro-dot only”) thought the chip disappeared.
 * Bumps them back to tier 1 (Tasks · purpose). They can re-select the dot via the layers control.
 */
const MICRO_DOT_UI_RESTORE_KEY = 'divine-protocol-rail-micro-dot-restored-202604'

/** 0 = full “Protocols & tasks”, 1 = “Tasks · purpose”, 2 = micro dot only */
type DisplayLevel = 0 | 1 | 2

function loadDisplayLevel(): DisplayLevel {
  if (typeof window === 'undefined') return 0
  const v2 = window.localStorage.getItem(DISPLAY_LEVEL_KEY)
  if (v2 === '0' || v2 === '1' || v2 === '2') {
    let d = Number.parseInt(v2, 10) as DisplayLevel
    if (d === 2 && window.localStorage.getItem(MICRO_DOT_UI_RESTORE_KEY) === null) {
      try {
        window.localStorage.setItem(MICRO_DOT_UI_RESTORE_KEY, '1')
        window.localStorage.setItem(DISPLAY_LEVEL_KEY, '1')
      } catch {
        /* ignore */
      }
      d = 1
    }
    return d
  }
  const leg = window.localStorage.getItem(LEGACY_DISPLAY_LEVEL_KEY)
  /* Older two-tier installs: land on Tasks · purpose (readable) vs easy-to-miss dot */
  if (leg === '1' || leg === '2') return 0
  /* Default collapsed chip: full “Protocols & tasks” header (wider extender). Tier 1 = Tasks · purpose; 2 = dot. */
  return 0
}

/** Tooltip text for Layers — hide-strip control (paired with tinted icon). */
function layersCollapseCopy(accentTone: ProtocolRailLayersTone) {
  switch (accentTone) {
    case 'purple':
      return {
        titleStrip: 'New protocol task · collapses protocols strip · crown unchanged',
        ariaStrip: 'Hide protocols strip · new task queued',
      }
    case 'orange':
      return {
        titleStrip: 'Open tasks · hide protocols strip · crown unchanged',
        ariaStrip: 'Hide protocols strip · tasks to finish',
      }
    case 'green':
      return {
        titleStrip: 'Nothing open · hide protocols strip · crown unchanged',
        ariaStrip: 'Hide protocols strip · queue clear',
      }
    default:
      return {
        titleStrip: 'Hide protocols strip — crown stays',
        ariaStrip: 'Hide protocols & tasks strip',
      }
  }
}

export function DivineProtocolTaskRail({
  onCollapseProtocolRail,
  acknowledgeNewGlow,
  layersAccentTone = 'muted',
  layersToneClassName,
}: {
  onCollapseProtocolRail?: () => void
  acknowledgeNewGlow?: () => void
  layersAccentTone?: ProtocolRailLayersTone
  layersToneClassName?: string
} = {}) {
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
  /**
   * When work is open, always show tier-0 “Protocols & tasks » N open” (Layers + chevron + title + count).
   * Otherwise compact tiers (Tasks · purpose / dot) make that row disappear — users assumed it broke.
   */
  const headerLevel: DisplayLevel = menuOpen ? 0 : hasOpenWork ? 0 : displayLevel

  useEffect(() => {
    if (menuOpen) acknowledgeNewGlow?.()
  }, [menuOpen, acknowledgeNewGlow])

  const layersBtnClassName = cn(
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
    layersToneClassName ?? protocolRailLayersIconClass(layersAccentTone ?? 'muted'),
  )

  const collapseCopy = useMemo(() => layersCollapseCopy(layersAccentTone ?? 'muted'), [layersAccentTone])

  const onLayersCollapseRailClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onCollapseProtocolRail) return
    if (menuOpen) setMenuOpen(false)
    onCollapseProtocolRail()
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

  /** Empty + collapsed: full label, compact “Tasks · purpose”, or micro dot */
  if (showEmptyShell && !menuOpen) {
    const lv = displayLevel
    return (
      <div className="divine-protocol-stack-shell flex w-fit max-w-[min(92vw,400px)] items-center gap-1">
        {onCollapseProtocolRail ? (
          <button
            type="button"
            className={layersBtnClassName}
            onClick={onLayersCollapseRailClick}
            title={collapseCopy.titleStrip}
            aria-label={collapseCopy.ariaStrip}
          >
            <Layers2 className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Hide protocols strip</span>
          </button>
        ) : null}
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-between border border-amber-400/15 bg-gradient-to-br from-amber-500/[0.06] to-purple-500/[0.07] text-left shadow-sm backdrop-blur-xl transition-colors duration-200 hover:from-amber-500/10 hover:to-purple-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
            lv === 2 ? 'h-9 min-w-9 rounded-full p-0' : 'max-w-full gap-3 rounded-2xl px-4 py-2.5',
            lv === 1 && 'max-w-[min(88vw,17rem)]',
          )}
          onClick={() => setMenuOpen(true)}
          aria-label={
            lv === 2
              ? 'Protocols and tasks — no open work'
              : lv === 1
                ? 'Tasks and purpose — no open work'
                : 'Open protocols and tasks panel, none open'
          }
        >
          {lv === 2 ? (
            <span
              className="mx-auto block h-2 w-2 rounded-full bg-muted-foreground/35 ring-1 ring-border/60"
              aria-hidden
            />
          ) : lv === 1 ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[12px] font-semibold tracking-tight text-foreground">Tasks · purpose</span>
              <span className="text-[11px] leading-snug text-muted-foreground/80">Queue &amp; briefing — open</span>
            </div>
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
        'divine-protocol-stack-shell overflow-hidden rounded-2xl border border-border/50 bg-card/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] touch-pan-y',
        menuOpen && !showEmptyShell ? 'w-[min(92vw,400px)]' : 'w-fit max-w-[min(92vw,400px)]',
        showEmptyShell
          ? cn(
              'border-dashed border-border/45 bg-card/75',
              menuOpen && 'flex min-h-[11rem] max-h-[min(78dvh,calc(100dvh-9rem))] flex-col',
            )
          : cn(
              'flex w-full shrink-0 flex-col',
              menuOpen && 'min-h-[11rem] max-h-[min(78dvh,calc(100dvh-9rem))]',
            ),
      )}
    >
      <Collapsible
        open={menuOpen}
        onOpenChange={setMenuOpen}
        /* flex-1 only while open so body fills shell; avoid basis-0 (collapses rail when toggling chevron). */
        className={cn('flex min-h-0 flex-col', menuOpen && 'flex-1')}
      >
        <div
          className={cn(
            'flex min-h-9 w-full min-w-0 items-center gap-1.5 pt-3 sm:gap-2',
            headerLevel === 2 && !menuOpen ? 'justify-center px-2' : 'justify-start px-3',
          )}
        >
          {onCollapseProtocolRail ? (
            <button
              type="button"
              className={layersBtnClassName}
              onClick={onLayersCollapseRailClick}
              title={collapseCopy.titleStrip}
              aria-label={collapseCopy.ariaStrip}
            >
              <Layers2 className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Hide protocols strip</span>
            </button>
          ) : null}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
                headerLevel === 2
                  ? 'inline-flex min-h-9 min-w-9 items-center justify-center rounded-full hover:bg-muted/40'
                  : headerLevel === 1
                    ? 'inline-flex w-fit max-w-[min(calc(100%-2.75rem),19rem)] flex-col items-start gap-0.5 rounded-xl px-2 py-1 hover:bg-muted/35 sm:items-end sm:text-right'
                    : 'inline-flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/35 sm:flex-initial sm:gap-2.5',
              )}
              aria-label={
                headerLevel === 2
                  ? hasOpenWork
                    ? `Protocols and tasks, ${openTasks.length} open`
                    : 'Protocols and tasks, no open items'
                  : headerLevel === 1
                    ? hasOpenWork
                      ? `Tasks and purpose, ${openTasks.length} open`
                      : 'Tasks and purpose'
                    : undefined
              }
            >
              {headerLevel === 2 ? (
                hasOpenWork ? (
                  <span
                    className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/25 dark:bg-venus dark:ring-venus/25"
                    aria-hidden
                  />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/35 ring-1 ring-border/50" aria-hidden />
                )
              ) : headerLevel === 1 ? (
                <>
                  <span className="text-[12px] font-semibold tracking-tight text-foreground">Tasks · purpose</span>
                  {triggerMeta(true)}
                </>
              ) : (
                <>
                  {menuOpen ? (
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground/80 transition-transform duration-200 ease-out"
                      aria-hidden
                    />
                  ) : (
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground/80"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 text-[13px] font-semibold tracking-tight text-foreground">
                    Protocols &amp; tasks
                  </span>
                  {triggerMeta(false)}
                </>
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent
          className={cn(
            !showEmptyShell &&
              'flex min-h-0 flex-col overflow-hidden data-[state=open]:flex-1',
          )}
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
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
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
              <div className="min-h-0 min-w-0 max-h-[min(52dvh,calc(100dvh-20rem))] shrink touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain pr-2 [scrollbar-gutter:stable]">
                <div className="flex flex-col gap-2 p-3">
                  {loading && !openTasks.length ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" aria-hidden />
                      <p className="text-[12px] text-muted-foreground/75">Loading tasks</p>
                    </div>
                  ) : (
                    <>
                      {/* Peek: read-only; Done / inbox only on Divine Manager */}
                      <ProtocolOpenTasksListPeek tasks={openTasks} textAlign="right" />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
