'use client'

import { useEffect, useState, useCallback, useRef, type MouseEvent, type PointerEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { DivineWorkingLogo } from '@/components/divine/divine-working-logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useWorkspaceCapabilities } from '@/components/dashboard/workspace-capabilities-context'
import {
  Crown,
  Layers2,
  Mic,
  PhoneOff,
  MessageSquare,
  Sparkles,
  LayoutDashboard,
  ListTodo,
  MoreHorizontal,
} from 'lucide-react'
import { DivineTranscriptStack } from '@/components/divine/divine-transcript-card'
import { useDivineCrownStateClass } from '@/components/divine/use-divine-crown-state-class'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { DivineProtocolTaskRail } from '@/components/divine/divine-protocol-task-rail'
import { useProtocolRailLayersAccent } from '@/components/divine/use-protocol-rail-layers-accent'

/** Shared surface for Divine shortcut menus (skip-launcher, in-call overflow). */
const divineSubmenuContentClass =
  'z-[110] min-w-[14.25rem] rounded-2xl border border-white/10 bg-popover/96 p-1.5 shadow-[0_14px_48px_-18px_rgba(0,0,0,0.52)] backdrop-blur-2xl duration-200 dark:border-white/[0.08]'

const divineSubmenuItemClass =
  'cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-foreground/90 data-[highlighted]:bg-foreground/[0.04] dark:data-[highlighted]:bg-white/[0.05]'

const divineSubmenuSeparatorClass = 'my-1.5 bg-border/55 dark:bg-white/[0.06]'

const DIVINE_MANAGER_VOICE_RATE_HINT =
  'Included with your subscription · 2 credits/sec while live (~$1/min)'

/** Launcher shortcuts: tinted icon tiles + label (high-visibility). */
const launcherRowClass =
  'group/row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[background-color,color] duration-150 ease-out hover:bg-foreground/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/12 focus-visible:ring-offset-0 dark:hover:bg-white/[0.04]'

const FAB_INSET_LS_KEY = 'divine_fab_inset_v1'
/** When "1", tasks & protocols rail is tucked — crown launcher stays visible */
const PROTOCOL_RAIL_COLLAPSED_LS_KEY = 'divine_protocol_rail_collapsed_v1'
const FAB_EDGE_MARGIN = 10
const FAB_DRAG_THRESHOLD_PX = 12
/** Require hold before FAB can be dragged; short tap opens the launcher instead. */
const FAB_LONG_PRESS_ARM_MS = 2000

function clampFabInset(right: number, bottom: number, elWidth: number, elHeight: number) {
  if (typeof window === 'undefined') return { right, bottom }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const minR = FAB_EDGE_MARGIN
  const maxR = Math.max(minR, vw - FAB_EDGE_MARGIN - elWidth)
  const minB = FAB_EDGE_MARGIN
  const maxB = Math.max(minB, vh - FAB_EDGE_MARGIN - elHeight)
  return {
    right: Math.min(maxR, Math.max(minR, Math.round(right))),
    bottom: Math.min(maxB, Math.max(minB, Math.round(bottom))),
  }
}

export function VoiceControlPopup() {
  const workspaceCaps = useWorkspaceCapabilities()
  const voice = useVoiceSession()
  const pathname = usePathname()
  const messagesRouteDefault = pathname?.startsWith('/dashboard/messages') === true
  const [expanded, setExpanded] = useState(false)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [skipLauncher, setSkipLauncher] = useState(false)
  /** Expanded voice dock only once a session is live (never idle — idle uses crown + launcher only). */
  const voiceDeckOpen = Boolean(voice && expanded && voice.status !== 'idle')
  const crownStateClass = useDivineCrownStateClass(voiceDeckOpen)

  const [fabInset, setFabInset] = useState<{ right: number; bottom: number } | null>(null)
  const [fabDragArmedVisual, setFabDragArmedVisual] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)
  const fabDragRef = useRef<{
    pointerId: number
    x0: number
    y0: number
    r0: number
    b0: number
    dragging: boolean
    armed: boolean
    longPressTimer: ReturnType<typeof setTimeout> | null
  } | null>(null)
  const skipFabClickRef = useRef(false)

  const protocolTasks = useProtocolTasks()
  const { layersToneClassName: protocolLayersToneClassName, acknowledgeNewGlow, tone: layersAccentTone } =
    useProtocolRailLayersAccent(protocolTasks.tasks, protocolTasks.loading, protocolTasks.error ?? null)

  const [protocolRailCollapsed, setProtocolRailCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        setProtocolRailCollapsed(window.localStorage.getItem(PROTOCOL_RAIL_COLLAPSED_LS_KEY) === '1')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const collapseProtocolRail = useCallback(() => {
    setProtocolRailCollapsed(true)
    try {
      localStorage.setItem(PROTOCOL_RAIL_COLLAPSED_LS_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const expandProtocolRail = useCallback(() => {
    acknowledgeNewGlow()
    setProtocolRailCollapsed(false)
    try {
      localStorage.setItem(PROTOCOL_RAIL_COLLAPSED_LS_KEY, '0')
    } catch {
      /* ignore */
    }
  }, [acknowledgeNewGlow])

  const persistFabInset = useCallback((next: { right: number; bottom: number }) => {
    setFabInset(next)
    try {
      localStorage.setItem(FAB_INSET_LS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const guardFabClick = useCallback((e: MouseEvent) => {
    if (skipFabClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      skipFabClickRef.current = false
    }
  }, [])

  const handleFabPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (voiceDeckOpen || launcherOpen) return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const t = e.target as HTMLElement
      // Only the crown arms drag — tap crown opens the launcher / voice; long-press crown then drag moves the stack.
      if (!t.closest('.divine-crown-trigger')) return
      if (t.closest('.divine-protocol-stack-shell') && t.closest('button, a')) {
        return
      }
      const el = fabRef.current
      if (!el) return
      const prev = fabDragRef.current
      if (prev?.longPressTimer) {
        clearTimeout(prev.longPressTimer)
      }
      const r = el.getBoundingClientRect()
      const pointerId = e.pointerId
      const x0 = e.clientX
      const y0 = e.clientY
      const r0 = window.innerWidth - r.right
      const b0 = window.innerHeight - r.bottom

      const state = {
        pointerId,
        x0,
        y0,
        r0,
        b0,
        dragging: false,
        armed: false,
        longPressTimer: setTimeout(() => {
          const cur = fabDragRef.current
          if (!cur || cur.pointerId !== pointerId) return
          cur.armed = true
          cur.longPressTimer = null
          setFabDragArmedVisual(true)
          try {
            el.setPointerCapture(pointerId)
          } catch {
            /* ignore */
          }
        }, FAB_LONG_PRESS_ARM_MS),
      }
      fabDragRef.current = state
    },
    [voiceDeckOpen, launcherOpen],
  )

  const handleFabPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const s = fabDragRef.current
    if (!s || e.pointerId !== s.pointerId) return
    const dx = e.clientX - s.x0
    const dy = e.clientY - s.y0

    if (!s.armed) {
      if (Math.hypot(dx, dy) <= FAB_DRAG_THRESHOLD_PX) return
      if (s.longPressTimer) {
        clearTimeout(s.longPressTimer)
        s.longPressTimer = null
      }
      fabDragRef.current = null
      return
    }

    if (!s.dragging) {
      if (Math.hypot(dx, dy) <= FAB_DRAG_THRESHOLD_PX) return
      s.dragging = true
    }
    e.preventDefault()
    const el = fabRef.current
    if (!el) return
    const next = clampFabInset(s.r0 - dx, s.b0 - dy, el.offsetWidth, el.offsetHeight)
    setFabInset(next)
  }, [])

  const handleFabPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const s = fabDragRef.current
      if (!s || e.pointerId !== s.pointerId) return

      if (s.longPressTimer) {
        clearTimeout(s.longPressTimer)
        s.longPressTimer = null
      }

      const wasArmed = s.armed
      const wasDragging = s.dragging
      fabDragRef.current = null
      setFabDragArmedVisual(false)

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released or never captured */
      }

      if (wasDragging && fabRef.current) {
        const el = fabRef.current
        const r = el.getBoundingClientRect()
        persistFabInset(
          clampFabInset(
            window.innerWidth - r.right,
            window.innerHeight - r.bottom,
            el.offsetWidth,
            el.offsetHeight,
          ),
        )
        skipFabClickRef.current = true
      } else if (wasArmed && !wasDragging) {
        // Held long enough to arm drag but released without moving — don't open launcher.
        skipFabClickRef.current = true
      }
    },
    [persistFabInset],
  )

  useEffect(() => {
    return () => {
      const s = fabDragRef.current
      if (s?.longPressTimer) clearTimeout(s.longPressTimer)
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAB_INSET_LS_KEY)
      if (!raw) return
      const j = JSON.parse(raw) as { right?: unknown; bottom?: unknown }
      if (
        typeof j.right === 'number' &&
        typeof j.bottom === 'number' &&
        Number.isFinite(j.right) &&
        Number.isFinite(j.bottom)
      ) {
        setFabInset({ right: j.right, bottom: j.bottom })
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (!fabRef.current) return
      setFabInset((prev) => {
        if (!prev) return prev
        const el = fabRef.current!
        const r = el.getBoundingClientRect()
        return clampFabInset(
          window.innerWidth - r.right,
          window.innerHeight - r.bottom,
          el.offsetWidth,
          el.offsetHeight,
        )
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const loadFabSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/divine/manager-settings', { credentials: 'include' })
      const j = (await res.json()) as { voice_fab_skip_launcher?: boolean }
      if (res.ok && typeof j.voice_fab_skip_launcher === 'boolean') {
        setSkipLauncher(j.voice_fab_skip_launcher)
      }
    } catch {
      // keep default false
    }
  }, [])

  useEffect(() => {
    void loadFabSettings()
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadFabSettings()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [loadFabSettings])

  const isActive =
    voice?.status === 'connected' || voice?.status === 'connecting'
  const hasStartedCall = voice ? voice.status !== 'idle' : false

  useEffect(() => {
    if (!voice) return
    // Collapse when the call fully ends; do not force-expand while connected — user can collapse and read status on the crown (mic-style colors).
    if (!hasStartedCall) setExpanded(false)
  }, [voice, hasStartedCall])

  if (!voice) return null

  const {
    status,
    error,
    startVoiceCall,
    endVoiceCall,
    forceEndVoiceCall,
    voiceVizRef,
    voiceSurfaceState,
    canManualHangup,
    divineVoicePremium,
  } = voice

  const primaryLabel =
    status === 'idle'
      ? 'Idle'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'connected'
          ? 'Listening'
          : 'Error'

  const startVoiceFromLauncher = async () => {
    setLauncherOpen(false)
    setExpanded(true)
    await startVoiceCall()
  }

  const handleCrownClickInstant = async () => {
    setExpanded(true)
    await startVoiceCall()
  }

  const handleCrownToggleExpand = () => {
    setExpanded((prev) => !prev)
  }

  const crownClassName = cn(
    'divine-fab-crown divine-crown-trigger grid w-[4.125rem] min-w-[66px] shrink-0 place-items-center p-0 leading-none',
    'transition-[transform,box-shadow,filter,color] duration-200 ease-out',
    'motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]',
    voiceDeckOpen
      ? 'h-full min-h-[4.125rem] self-stretch rounded-none border-l border-black/10 dark:border-white/12'
      : 'h-[4.125rem] min-h-[66px] rounded-full border border-black/[0.08] dark:border-white/[0.14]',
    crownStateClass,
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/18 focus-visible:ring-offset-0',
  )

  const renderCrownButton = () => {
    if (status === 'idle' && !skipLauncher) {
      return (
        <Popover open={launcherOpen} onOpenChange={setLauncherOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(crownClassName, 'select-none')}
              style={{ WebkitTouchCallout: 'none' }}
              aria-label="Open Divine launcher — tap for menu; hold crown two seconds, then drag to move"
              title="Tap to open. Hold the crown 2 seconds (ring appears), then drag to move."
              onClick={guardFabClick}
            >
              <Crown className="pointer-events-none block h-6 w-6 shrink-0" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={12}
            className="group/aitools divine-launcher-panel z-[110] w-[min(calc(100vw-2rem),21rem)] overflow-hidden rounded-[22px] border border-zinc-200/14 bg-popover p-0 shadow-[0_28px_90px_-36px_rgba(0,0,0,0.5)] backdrop-blur-xl dark:border-white/[0.07] dark:bg-zinc-950/94"
          >
            <div className="pointer-events-none absolute inset-0 opacity-[0.04] constellation-bg dark:opacity-[0.035]" />
            <div className="relative px-6 pb-8 pt-7">
              <header className="space-y-3">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="ai-tools-wordmark text-[1.3125rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
                    Divine
                  </h2>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                    Idle
                  </span>
                </div>
                <p className="max-w-[30ch] text-[13px] font-normal leading-[1.52] tracking-[-0.01em] text-muted-foreground">
                  Voice when you want it. Text and tools when you don&apos;t.
                </p>
              </header>

              <div className="mt-9">
                {divineVoicePremium ? (
                  <button
                    type="button"
                    className={cn(
                      'flex h-[3.125rem] w-full items-center justify-center gap-2.5 rounded-2xl text-[15px] font-semibold tracking-[-0.02em] text-white',
                      'bg-gradient-to-r from-amber-600/95 to-purple-600/95 shadow-[0_10px_36px_-14px_rgba(124,58,237,0.55)] transition-[transform,box-shadow,filter] duration-200',
                      'hover:from-amber-500 hover:to-purple-500 hover:shadow-[0_14px_40px_-14px_rgba(124,58,237,0.5)] motion-safe:active:scale-[0.99]',
                    )}
                    onClick={() => {
                      void startVoiceFromLauncher()
                    }}
                  >
                    <Mic className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-95" aria-hidden />
                    Start voice
                  </button>
                ) : (
                  <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.09] via-transparent to-purple-500/[0.06] px-[1.0625rem] py-[1.0625rem] dark:border-white/[0.1]">
                    <p className="text-[13px] leading-[1.58] tracking-[-0.01em] text-muted-foreground">
                      Premium voice unlocks realtime audio, tools, Markit, and dashboard handoff.
                    </p>
                    <Link
                      href="/dashboard/settings?tab=billing"
                      onClick={() => setLauncherOpen(false)}
                      className={cn(
                        'mt-[1.0625rem] flex h-11 w-full items-center justify-center rounded-xl text-[13px] font-semibold tracking-tight text-white shadow-md transition-opacity hover:opacity-95',
                        'bg-gradient-to-r from-amber-700/90 to-purple-700/90',
                      )}
                    >
                      View plans
                    </Link>
                  </div>
                )}
              </div>

              <nav
                className="mt-10 flex flex-col gap-0.5 border-t border-border/40 pt-[1.375rem] dark:border-white/[0.06]"
                aria-label="Divine shortcuts"
              >
                <Link
                  href="/dashboard/divine-manager?section=text"
                  className={launcherRowClass}
                  onClick={() => setLauncherOpen(false)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/12 text-purple-500 transition-colors duration-150 group-hover/row:bg-purple-500/16 dark:text-purple-400">
                    <MessageSquare className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                  </span>
                  <span className="min-w-0 text-[15px] font-medium tracking-[-0.015em] text-foreground/95">
                    Text Divine
                  </span>
                </Link>
                <Link
                  href="/dashboard/divine-manager"
                  className={cn(launcherRowClass, 'items-start')}
                  onClick={() => setLauncherOpen(false)}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 transition-colors duration-150 group-hover/row:bg-amber-500/16 dark:text-amber-400">
                    <LayoutDashboard className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[15px] font-medium tracking-[-0.015em] text-foreground/95">Divine Manager</span>
                    <span className="text-[11px] leading-[1.42] text-muted-foreground/90">
                      {workspaceCaps.canUseDivineManagerNav
                        ? DIVINE_MANAGER_VOICE_RATE_HINT
                        : 'Included on the full creator plan.'}
                    </span>
                  </span>
                </Link>
                <Link
                  href="/dashboard/divine-manager?section=protocol"
                  className={launcherRowClass}
                  onClick={() => setLauncherOpen(false)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-500 transition-colors duration-150 group-hover/row:bg-amber-500/16 dark:text-amber-400">
                    <ListTodo className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                  </span>
                  <span className="min-w-0 text-[15px] font-medium tracking-[-0.015em] text-foreground/95">
                    Today&apos;s plan &amp; protocol
                  </span>
                </Link>
                <Link
                  href="/dashboard/divine-manager?section=tasks"
                  className={launcherRowClass}
                  onClick={() => setLauncherOpen(false)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-500 transition-colors duration-150 group-hover/row:bg-violet-500/16 dark:text-violet-400">
                    <ListTodo className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                  </span>
                  <span className="min-w-0 text-[15px] font-medium tracking-[-0.015em] text-foreground/95">
                    Manager tasks &amp; suggestions
                  </span>
                </Link>
                <Link href="/dashboard/ai-studio?tab=tools" className={launcherRowClass} onClick={() => setLauncherOpen(false)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/12 text-purple-500 transition-colors duration-150 group-hover/row:bg-purple-500/16 dark:text-purple-400">
                    <Sparkles className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                  </span>
                  <span className="min-w-0 text-[15px] font-medium tracking-[-0.015em] text-foreground/95">
                    AI Studio tools
                  </span>
                </Link>
              </nav>
            </div>
          </PopoverContent>
        </Popover>
      )
    }

    if (status === 'idle' && skipLauncher) {
      return (
        <div className="flex shrink-0 items-stretch">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="grid h-[4.125rem] w-11 min-h-[66px] shrink-0 place-items-center rounded-l-full border border-r-0 border-white/12 bg-card/85 text-muted-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-[background-color,color] duration-200 hover:bg-muted/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 dark:border-white/10"
                aria-label="Divine shortcuts — plan, tasks, text"
                title="Plan, tasks, text chat"
                onClick={guardFabClick}
              >
                <MoreHorizontal className="h-5 w-5 opacity-80" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className={divineSubmenuContentClass}>
              <DropdownMenuItem asChild className={divineSubmenuItemClass}>
                <Link href="/dashboard/divine-manager?section=protocol">
                  <ListTodo className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                  Today&apos;s plan &amp; protocol
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={divineSubmenuItemClass}>
                <Link href="/dashboard/divine-manager?section=tasks">
                  <ListTodo className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" />
                  Manager tasks &amp; suggestions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={divineSubmenuSeparatorClass} />
              <DropdownMenuItem asChild className={divineSubmenuItemClass}>
                <Link href="/dashboard/divine-manager?section=text">
                  <MessageSquare className="h-4 w-4 shrink-0 text-purple-500 dark:text-purple-400" />
                  Text Divine
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={divineSubmenuItemClass}>
                <Link href="/dashboard/divine-manager">
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  Divine Manager
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={(e) => {
              if (skipFabClickRef.current) {
                e.preventDefault()
                e.stopPropagation()
                skipFabClickRef.current = false
                return
              }
              if (!divineVoicePremium) {
                setExpanded(true)
                void startVoiceCall()
                return
              }
              void handleCrownClickInstant()
            }}
            className={cn(
              crownClassName,
              'rounded-l-none rounded-r-full border-l-0',
            )}
            aria-label={divineVoicePremium ? 'Start Divine voice call' : 'Divine voice — Premium'}
            title={
              divineVoicePremium
                ? 'Start Divine voice call — hold 2s on the stack, then drag to move'
                : 'Divine voice — Premium required — hold 2s on the stack, then drag to move'
            }
          >
            <Crown className="pointer-events-none block h-6 w-6 shrink-0" aria-hidden />
          </button>
        </div>
      )
    }

    const collapsedCallLabel =
      status === 'error'
        ? 'Divine voice error — expand for details'
        : status === 'connecting'
          ? 'Divine voice connecting — expand for controls'
          : 'Divine voice active — expand for End and tools'

    return (
      <button
        type="button"
        onClick={(e) => {
          if (skipFabClickRef.current) {
            e.preventDefault()
            e.stopPropagation()
            skipFabClickRef.current = false
            return
          }
          handleCrownToggleExpand()
        }}
        className={crownClassName}
        aria-label={expanded ? 'Collapse Divine voice control' : hasStartedCall ? collapsedCallLabel : 'Expand Divine voice control'}
        title={
          (expanded ? 'Collapse Divine voice control' : hasStartedCall ? collapsedCallLabel : 'Expand Divine voice control') +
          ' — hold 2s on the stack, then drag to move when collapsed'
        }
      >
        <Crown className="pointer-events-none block h-6 w-6 shrink-0" aria-hidden />
      </button>
    )
  }

  return (
    <>
      <DivineTranscriptStack />
      <div
        ref={fabRef}
        onPointerDownCapture={handleFabPointerDown}
        onPointerMoveCapture={handleFabPointerMove}
        onPointerUpCapture={handleFabPointerUp}
        onPointerCancelCapture={handleFabPointerUp}
        className={cn(
          'group/divineFab fixed z-40 flex touch-none flex-col items-end gap-3',
          fabDragArmedVisual && 'ring-2 ring-amber-400/35 ring-offset-2 ring-offset-transparent rounded-[2.75rem]',
          fabInset == null &&
            (messagesRouteDefault
              ? 'bottom-[max(8.5rem,calc(env(safe-area-inset-bottom)+7.25rem))] right-3 sm:right-5'
              : 'bottom-6 right-6'),
        )}
        style={
          fabInset
            ? { right: fabInset.right, bottom: fabInset.bottom, left: 'auto', top: 'auto' }
            : undefined
        }
      >
        {!protocolRailCollapsed ? (
          <div className="flex max-h-[min(78dvh,calc(100dvh-5.5rem))] min-h-0 min-w-0 w-full max-w-[min(92vw,400px)] shrink-0 touch-pan-y flex-col">
            <DivineProtocolTaskRail
              acknowledgeNewGlow={acknowledgeNewGlow}
              layersAccentTone={layersAccentTone}
              layersToneClassName={protocolLayersToneClassName}
              onCollapseProtocolRail={collapseProtocolRail}
            />
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-card/93 shadow-sm backdrop-blur-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 dark:border-white/[0.09]',
              protocolLayersToneClassName,
            )}
            onClick={expandProtocolRail}
            aria-label={
              layersAccentTone === 'purple'
                ? 'Show protocols rail · new task in queue'
                : layersAccentTone === 'orange'
                  ? 'Show protocols rail · tasks to do'
                  : layersAccentTone === 'green'
                    ? 'Show protocols rail · queue clear'
                    : 'Show protocols and tasks rail'
            }
            title={
              layersAccentTone === 'purple'
                ? 'New protocol task · show strip'
                : layersAccentTone === 'orange'
                  ? 'Tasks open · show protocols strip'
                  : layersAccentTone === 'green'
                    ? 'All clear · show protocols strip'
                    : 'Show protocols strip'
            }
          >
            <Layers2 className="h-[1.0625rem] w-[1.0625rem] opacity-95" aria-hidden />
          </button>
        )}
        <div
          className={cn(
            'flex overflow-hidden rounded-full shadow-[0_16px_50px_-28px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] transition-all duration-300 motion-reduce:transition-none dark:ring-white/[0.055]',
            voiceDeckOpen
              ? 'divine-voice-pill-expanded h-auto min-h-[4.125rem] w-[min(92vw,660px)] items-stretch rounded-[22px] bg-card/93 backdrop-blur-md dark:bg-zinc-950/90'
              : 'h-[4.125rem] min-h-[66px] w-[4.125rem] min-w-[66px] items-center border-0 bg-transparent shadow-none ring-0',
          )}
        >
          <div
            className={cn(
              'min-w-0 transition-all duration-300 motion-reduce:transition-none',
              voiceDeckOpen ? 'flex-1 px-3 py-2.5 opacity-100' : 'w-0 px-0 py-0 opacity-0',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  status === 'error'
                    ? 'bg-red-500/10 text-red-500'
                    : status === 'connecting'
                      ? 'bg-amber-500/10 text-amber-500'
                      : isActive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground',
                )}
              >
                <Mic className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug tracking-[-0.015em] text-foreground/95">
                  Divine voice · {primaryLabel}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-muted-foreground/88">
                  You can keep browsing; call stays active.
                </span>
                <DivineWorkingLogo
                  variant={isActive ? voiceSurfaceState : 'idle'}
                  className="mt-0.5"
                  wordmarkClassName={!isActive ? 'ai-tools-wordmark text-[11px]' : undefined}
                />
              </div>
              <canvas
                ref={voiceVizRef}
                width={94}
                height={33}
                className="hidden shrink-0 self-center rounded-md bg-muted sm:block"
              />
              {!isActive ? (
                divineVoicePremium ? (
                  <Button size="sm" className="h-8 shrink-0 self-center text-xs" onClick={() => { void startVoiceCall() }}>
                    Start call
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 shrink-0 self-center text-xs" asChild>
                    <Link href="/dashboard/settings?tab=billing">Premium</Link>
                  </Button>
                )
              ) : (
                <div className="flex shrink-0 flex-col items-end gap-1 self-center">
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 p-0"
                          aria-label="Plan and tasks shortcuts"
                          title="Protocols & tasks, Divine chat, manager"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={divineSubmenuContentClass}>
                        <DropdownMenuItem asChild className={divineSubmenuItemClass}>
                          <Link href="/dashboard/divine-manager?section=protocol">
                            <ListTodo className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                            Today&apos;s plan &amp; protocol
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className={divineSubmenuItemClass}>
                          <Link href="/dashboard/divine-manager?section=tasks">
                            <ListTodo className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" />
                            Manager tasks &amp; suggestions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className={divineSubmenuSeparatorClass} />
                        <DropdownMenuItem asChild className={divineSubmenuItemClass}>
                          <Link href="/dashboard/divine-manager?section=text">
                            <MessageSquare className="h-4 w-4 shrink-0 text-purple-500 dark:text-purple-400" />
                            Text Divine
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={!canManualHangup}
                      title={
                        canManualHangup
                          ? 'End voice call'
                          : 'Wait until Divine asks if you need anything else (or force end below)'
                      }
                      onClick={endVoiceCall}
                    >
                      <PhoneOff className="mr-1 h-3 w-3" />
                      End
                    </Button>
                  </div>
                  {!canManualHangup && (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={forceEndVoiceCall}
                    >
                      Force end call
                    </button>
                  )}
                </div>
              )}
            </div>
            {error && (
              <span className="mt-1 block max-w-[min(92vw,320px)] truncate text-[11px] text-destructive">{error}</span>
            )}
          </div>
          {renderCrownButton()}
        </div>
      </div>
    </>
  )
}
