'use client'

import { useEffect, useState, useCallback, useRef, type MouseEvent, type PointerEvent } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
import {
  divineVoiceCreditsPerMinute,
  formatDivineVoiceCreditsPerSecond,
} from '@/lib/billing/credit-economics'
import { DivineVoiceRateCard } from '@/components/divine/divine-voice-rate-card'
import { useWorkspaceCapabilities } from '@/components/dashboard/workspace-capabilities-context'
import {
  Crown,
  Coins,
  Layers2,
  Mic,
  PhoneOff,
  MessageSquare,
  Sparkles,
  LayoutDashboard,
  ListTodo,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { DivineTranscriptStack } from '@/components/divine/divine-transcript-card'
import { SidebarDivineManagerCrown } from '@/components/dashboard/sidebar-divine-manager-crown'
import { useDivineCrownStateClass } from '@/components/divine/use-divine-crown-state-class'
import { useProtocolTasks } from '@/components/divine/protocol-tasks-context'
import { DivineProtocolTaskRail } from '@/components/divine/divine-protocol-task-rail'
import { useProtocolRailLayersAccent } from '@/components/divine/use-protocol-rail-layers-accent'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'
import { useIsMobile } from '@/hooks/use-mobile'

/** Shared surface for Divine shortcut menus (skip-launcher, in-call overflow). */
const divineSubmenuContentClass =
  'z-[110] min-w-[14.25rem] rounded-2xl border border-white/10 bg-popover/96 p-1.5 shadow-[0_14px_48px_-18px_rgba(0,0,0,0.52)] backdrop-blur-2xl duration-200 dark:border-white/[0.08]'

const divineSubmenuItemClass =
  'cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-foreground/90 data-[highlighted]:bg-foreground/[0.04] dark:data-[highlighted]:bg-white/[0.05]'

const divineSubmenuSeparatorClass = 'my-1.5 bg-border/55 dark:bg-white/[0.06]'

/** Launcher shortcuts — soft violet→amber wash on hover; icons carry brand tint. */
const launcherRowClass =
  'group/row -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-gradient-to-r hover:from-violet-500/[0.09] hover:to-amber-400/[0.06] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-0 motion-safe:hover:translate-x-px dark:hover:from-violet-400/[0.12] dark:hover:to-amber-400/[0.08]'

/** One calm sentence under the title — never contradicts state (e.g. “call active” on error). */
function voicePillStatusSubtitle(status: string): string {
  switch (status) {
    case 'error':
      return 'Voice did not connect. You can keep using the rest of the app.'
    case 'connecting':
      return 'Setting up your microphone and session…'
    case 'connected':
      return 'Session is live — you can keep browsing here.'
    default:
      return 'Start a call when you are ready, or open the crown for shortcuts.'
  }
}

/** Short primary line + optional technical line for setup / API errors. */
function voicePillErrorPresentation(raw: string): { friendly: string; technical: string | null } {
  const t = raw.trim()
  if (!t) return { friendly: 'Something went wrong.', technical: null }
  if (/OPENAI_API_KEY|Realtime requires|Vercel AI Gateway/i.test(t)) {
    return {
      friendly: 'Live voice is not available here until Realtime is configured.',
      technical: t,
    }
  }
  if (t.length <= 96) return { friendly: t, technical: null }
  return { friendly: `${t.slice(0, 93)}…`, technical: t }
}

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
  const searchParams = useSearchParams()
  const messagesRouteDefault = pathname?.startsWith('/dashboard/messages') === true
  const isMobileViewport = useIsMobile()
  const [expanded, setExpanded] = useState(false)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [launcherShortcutsOpen, setLauncherShortcutsOpen] = useState(false)
  const [skipLauncher, setSkipLauncher] = useState(false)

  useEffect(() => {
    const onOpenLauncher = () => {
      setSkipLauncher(false)
      setLauncherOpen(true)
      setExpanded(false)
    }
    window.addEventListener('creatix:open-divine-voice-launcher', onOpenLauncher)
    return () => window.removeEventListener('creatix:open-divine-voice-launcher', onOpenLauncher)
  }, [])

  const { wallet, loading: creditLoading, error: creditError, refresh: refreshCredits } = useCreditSnapshot()
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

  const refreshVoiceEntitlement = voice?.refreshDivineVoiceEntitlement

  useEffect(() => {
    if (!launcherOpen) return
    void refreshCredits()
    void refreshVoiceEntitlement?.()
  }, [launcherOpen, refreshCredits, refreshVoiceEntitlement])

  useEffect(() => {
    if (!launcherOpen) setLauncherShortcutsOpen(false)
  }, [launcherOpen])

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
    voiceWorkLabel,
    canManualHangup,
    divineVoicePremium,
  } = voice

  const suppressIdleDivineFabStack =
    pathname === '/dashboard/ai-studio/tools/content-ideas' &&
    searchParams.get('tab') !== 'captions' &&
    status === 'idle'

  const messagesMobileIdleHideFab =
    messagesRouteDefault && isMobileViewport && status === 'idle'

  const hideIdleDivineFabStack = suppressIdleDivineFabStack || messagesMobileIdleHideFab

  const primaryLabel =
    status === 'idle'
      ? 'Idle'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'connected'
          ? 'Listening'
          : 'Needs attention'

  const voiceErrorPresentation =
    status === 'error' && error ? voicePillErrorPresentation(error) : null

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
              <SidebarDivineManagerCrown
                gradientSlot="voice-fab"
                iconBoxClass="pointer-events-none block h-6 w-6 shrink-0"
                className="divine-fab-idle-crown"
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={12}
            collisionPadding={12}
            className="divine-launcher-panel z-[110] flex max-h-[min(36rem,calc(100dvh-1.5rem))] w-[min(calc(100vw-2rem),20rem)] flex-col overflow-hidden rounded-2xl border-0 p-0 shadow-xl"
          >
            <div className="relative z-[1] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 pb-6 pt-[1.375rem] [-webkit-overflow-scrolling:touch]">
              <header className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-amber-600 bg-clip-text text-[1.125rem] font-semibold leading-tight tracking-[-0.03em] text-transparent sm:text-[1.25rem] dark:from-violet-200 dark:via-fuchsia-200 dark:to-amber-200">
                    Divine Manager
                  </h2>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className="animate-divine-launcher-status-pill rounded-full border border-violet-400/35 bg-gradient-to-br from-violet-500/15 to-amber-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-900 shadow-sm dark:border-white/15 dark:from-violet-400/20 dark:to-amber-400/15 dark:text-amber-50">
                      Idle
                    </span>
                    <span
                      className="animate-divine-launcher-status-pill rounded-full border border-amber-500/40 bg-gradient-to-br from-amber-400/20 via-violet-500/12 to-fuchsia-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-950 shadow-sm dark:border-amber-400/35 dark:from-amber-400/25 dark:via-violet-500/15 dark:to-fuchsia-500/12 dark:text-amber-50"
                      style={{ animationDelay: '420ms' }}
                    >
                      Beta
                    </span>
                  </div>
                </div>
                <p className="w-full text-pretty text-[12px] font-normal leading-relaxed tracking-[-0.006em] text-muted-foreground sm:text-[13px]">
                  Divine Manager Voice assistant is currently in{' '}
                  <span className="divine-launcher-beta-word">BETA</span>. Credit prices may be more expensive during this
                  phase for the moment.
                </p>
                <div
                  className="flex items-center justify-between gap-2 rounded-lg border border-violet-500/15 bg-violet-500/[0.05] px-2.5 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]"
                  role="status"
                  aria-live="polite"
                  title={creditError ?? undefined}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700/75 dark:text-violet-200/75">
                    <Coins className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    Credits remaining
                  </span>
                  <span className="tabular-nums text-[13px] font-semibold tracking-[-0.02em] text-foreground">
                    {creditLoading ? '…' : creditError || wallet === null ? '—' : wallet.totalRemaining.toLocaleString()}
                  </span>
                </div>
              </header>

              <DivineVoiceRateCard className="mt-5" />

              <div className="mt-5">
                {divineVoicePremium ? (
                  <Button
                    type="button"
                    variant="default"
                    className={cn(
                      'h-11 w-full rounded-xl text-[15px] font-semibold tracking-[-0.02em] text-white shadow-md transition-[filter,transform,opacity] duration-200 motion-safe:active:scale-[0.99]',
                      '!bg-gradient-to-r !from-violet-600 !via-fuchsia-600 !to-amber-500 hover:!brightness-110 hover:!from-violet-600 hover:!via-fuchsia-600 hover:!to-amber-500',
                      'focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      'dark:!from-violet-500 dark:!via-fuchsia-500 dark:!to-amber-400 dark:hover:!from-violet-500 dark:hover:!via-fuchsia-500 dark:hover:!to-amber-400',
                    )}
                    onClick={() => {
                      void startVoiceFromLauncher()
                    }}
                  >
                    <Mic className="mr-2 h-[1.0625rem] w-[1.0625rem] shrink-0 opacity-95" aria-hidden />
                    Start voice
                  </Button>
                ) : (
                  <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-muted/[0.2] to-amber-400/[0.1] px-3.5 py-3.5 dark:border-white/[0.1] dark:from-violet-400/15 dark:via-white/[0.04] dark:to-amber-400/10">
                    <p className="text-[13px] leading-relaxed tracking-[-0.01em] text-muted-foreground">
                      Premium voice adds realtime audio, tools, and dashboard handoff.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-3 h-10 w-full rounded-xl border border-violet-500/25 bg-background/80 text-[13px] font-semibold shadow-sm backdrop-blur-sm transition-colors hover:bg-violet-500/[0.08] dark:border-white/15 dark:hover:bg-white/[0.06]"
                      asChild
                    >
                      <Link href="/dashboard/settings?tab=billing" onClick={() => setLauncherOpen(false)}>
                        View plans
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-violet-500/15 bg-gradient-to-r from-transparent via-violet-500/[0.08] to-transparent pt-5 dark:border-white/[0.08] dark:via-amber-400/[0.06]">
                <button
                  type="button"
                  id="divine-launcher-shortcuts-trigger"
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-0.5 py-1.5 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35 dark:hover:bg-white/[0.05]"
                  aria-expanded={launcherShortcutsOpen}
                  aria-controls="divine-launcher-shortcuts-nav"
                  aria-label={launcherShortcutsOpen ? 'Hide tools' : 'Open tools'}
                  onClick={() => setLauncherShortcutsOpen((v) => !v)}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600/75 dark:text-violet-300/75">
                    Open tools
                  </span>
                  {launcherShortcutsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-80" aria-hidden />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-80" aria-hidden />
                  )}
                </button>
                {launcherShortcutsOpen ? (
                  <nav
                    id="divine-launcher-shortcuts-nav"
                    className="mt-1 flex flex-col gap-0.5 pb-0.5"
                    aria-label="Tools and shortcuts"
                  >
                    <Link
                      href="/dashboard/divine-manager?section=text"
                      className={launcherRowClass}
                      onClick={() => setLauncherOpen(false)}
                    >
                      <MessageSquare
                        className="h-[15px] w-[15px] shrink-0 text-violet-600 transition-colors duration-150 group-hover/row:text-violet-700 dark:text-violet-400 dark:group-hover/row:text-violet-300"
                        aria-hidden
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 text-[14px] font-medium tracking-[-0.012em] text-foreground/95">Text Divine</span>
                    </Link>
                    <Link
                      href="/dashboard/divine-manager"
                      className={cn(launcherRowClass, 'items-start')}
                      onClick={() => setLauncherOpen(false)}
                    >
                      <LayoutDashboard
                        className="mt-0.5 h-[15px] w-[15px] shrink-0 text-amber-600 transition-colors duration-150 group-hover/row:text-amber-700 dark:text-amber-400 dark:group-hover/row:text-amber-300"
                        aria-hidden
                        strokeWidth={1.75}
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[14px] font-medium tracking-[-0.012em] text-foreground/95">Divine Manager</span>
                        <span className="text-[11px] leading-snug text-muted-foreground">
                          {workspaceCaps.canUseDivineManagerNav
                            ? `Beta · live voice · ${divineVoiceCreditsPerMinute()} credits/min (~${formatDivineVoiceCreditsPerSecond()}/sec)`
                            : 'Included on the full creator plan.'}
                        </span>
                      </span>
                    </Link>
                    <Link
                      href="/dashboard/divine-manager?section=protocol"
                      className={launcherRowClass}
                      onClick={() => setLauncherOpen(false)}
                    >
                      <ListTodo
                        className="h-[15px] w-[15px] shrink-0 text-purple-600 transition-colors duration-150 group-hover/row:text-purple-700 dark:text-purple-400 dark:group-hover/row:text-purple-300"
                        aria-hidden
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 text-[14px] font-medium tracking-[-0.012em] text-foreground/95">
                        Today&apos;s plan &amp; protocol
                      </span>
                    </Link>
                    <Link
                      href="/dashboard/divine-manager?section=tasks"
                      className={launcherRowClass}
                      onClick={() => setLauncherOpen(false)}
                    >
                      <ListTodo
                        className="h-[15px] w-[15px] shrink-0 text-violet-600 transition-colors duration-150 group-hover/row:text-violet-700 dark:text-violet-400 dark:group-hover/row:text-violet-300"
                        aria-hidden
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 text-[14px] font-medium tracking-[-0.012em] text-foreground/95">
                        Manager tasks &amp; suggestions
                      </span>
                    </Link>
                    <Link href="/dashboard/ai-studio?tab=tools" className={launcherRowClass} onClick={() => setLauncherOpen(false)}>
                      <Sparkles
                        className="h-[15px] w-[15px] shrink-0 text-amber-500 transition-colors duration-150 group-hover/row:text-amber-600 dark:text-amber-400 dark:group-hover/row:text-amber-300"
                        aria-hidden
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 text-[14px] font-medium tracking-[-0.012em] text-foreground/95">AI Studio tools</span>
                    </Link>
                  </nav>
                ) : null}
              </div>
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
        ? 'Divine voice issue — expand for details'
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
      {!hideIdleDivineFabStack ? (
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
            'flex overflow-hidden transition-all duration-300 motion-reduce:transition-none',
            voiceDeckOpen
              ? 'divine-voice-pill-expanded relative h-auto min-h-[4.125rem] w-[min(92vw,660px)] items-stretch rounded-[22px] ring-0'
              : 'h-[4.125rem] min-h-[66px] w-[4.125rem] min-w-[66px] items-center rounded-full border-0 bg-transparent shadow-[0_16px_50px_-28px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] dark:ring-white/[0.055]',
          )}
        >
          <div
            className={cn(
              'relative z-[1] min-w-0 transition-all duration-300 motion-reduce:transition-none',
              voiceDeckOpen ? 'flex-1 px-5 py-4 opacity-100' : 'w-0 px-0 py-0 opacity-0',
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  status === 'error'
                    ? 'bg-orange-500/[0.12] text-orange-600 dark:bg-orange-400/15 dark:text-orange-300'
                    : status === 'connecting'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted/80 text-muted-foreground',
                )}
                aria-hidden
              >
                <Mic className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="text-[1.0625rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                    Divine voice
                  </span>
                  <span
                    className={cn(
                      'text-[13px] font-medium tabular-nums tracking-[-0.015em]',
                      status === 'error'
                        ? 'text-orange-600 dark:text-orange-300'
                        : status === 'connecting'
                          ? 'text-amber-600 dark:text-amber-400'
                          : isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground',
                    )}
                  >
                    {primaryLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-[1.45] text-muted-foreground">
                  {voiceWorkLabel ?? voicePillStatusSubtitle(status)}
                </p>
                <DivineWorkingLogo
                  variant={isActive ? voiceSurfaceState : 'idle'}
                  className="mt-1.5"
                  wordmarkClassName={!isActive ? 'ai-tools-wordmark text-[11px]' : undefined}
                />
              </div>
              <canvas
                ref={voiceVizRef}
                width={94}
                height={33}
                className="hidden shrink-0 self-center rounded-lg border border-black/[0.06] bg-white/[0.22] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:block"
              />
              {!isActive ? (
                divineVoicePremium ? (
                  <Button
                    size="sm"
                    className="h-9 shrink-0 self-center rounded-full px-4 text-[13px] font-medium shadow-sm"
                    onClick={() => {
                      void startVoiceCall()
                    }}
                  >
                    Start call
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-9 shrink-0 self-center rounded-full px-3 text-[13px]" asChild>
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
            {voiceErrorPresentation ? (
              <div className="mt-3 space-y-1 rounded-xl border border-black/[0.07] bg-white/[0.28] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md dark:border-white/[0.1] dark:bg-white/[0.05] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[13px] leading-snug text-foreground/90">{voiceErrorPresentation.friendly}</p>
                {voiceErrorPresentation.technical ? (
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/85 [overflow-wrap:anywhere]">
                    {voiceErrorPresentation.technical}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {renderCrownButton()}
        </div>
      </div>
      ) : null}
    </>
  )
}
