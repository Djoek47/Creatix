'use client'

import { useEffect, useState, useCallback } from 'react'
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
import {
  Crown,
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
import { DivineProtocolTaskRail } from '@/components/divine/divine-protocol-task-rail'

export function VoiceControlPopup() {
  const voice = useVoiceSession()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [skipLauncher, setSkipLauncher] = useState(false)
  const crownStateClass = useDivineCrownStateClass(expanded)

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

  const messagesRoute = pathname?.startsWith('/dashboard/messages') === true

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
    expanded
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
              className={crownClassName}
              aria-label="Open Divine launcher"
              title="Divine — voice, text, shortcuts"
            >
              <Crown className="pointer-events-none block h-6 w-6 shrink-0" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={10}
            className="divine-launcher-panel w-[min(calc(100vw-2rem),18rem)] p-0 overflow-hidden"
          >
            <div className="constellation-bg pointer-events-none absolute inset-0 opacity-[0.2] dark:opacity-[0.12]" />
            <div className="group/aitools relative space-y-3 p-4">
              <div className="flex items-center gap-2">
                <DivineWorkingLogo variant="idle" className="text-foreground" wordmarkClassName="ai-tools-wordmark text-sm" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Voice as primary — or jump to text chat and tools.
              </p>
              {divineVoicePremium ? (
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-amber-600 to-purple-600 text-white hover:from-amber-500 hover:to-purple-500"
                  onClick={() => {
                    void startVoiceFromLauncher()
                  }}
                >
                  <Mic className="h-4 w-4 shrink-0" aria-hidden />
                  Start voice call
                </Button>
              ) : (
                <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Divine voice is on Premium — includes Markit and the dashboard.
                  </p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/dashboard/settings?tab=billing" onClick={() => setLauncherOpen(false)}>
                      View plans
                    </Link>
                  </Button>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9" asChild>
                  <Link href="/dashboard/divine-manager?section=text" onClick={() => setLauncherOpen(false)}>
                    <MessageSquare className="h-4 w-4 shrink-0 text-purple-500" aria-hidden />
                    Text Divine
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9" asChild>
                  <Link href="/dashboard/divine-manager" onClick={() => setLauncherOpen(false)}>
                    <LayoutDashboard className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    Divine Manager
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9" asChild>
                  <Link
                    href="/dashboard/divine-manager?section=protocol"
                    onClick={() => setLauncherOpen(false)}
                  >
                    <ListTodo className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                    Today&apos;s plan &amp; protocol
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9" asChild>
                  <Link href="/dashboard/divine-manager?section=tasks" onClick={() => setLauncherOpen(false)}>
                    <ListTodo className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                    Manager tasks &amp; suggestions
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9" asChild>
                  <Link href="/dashboard/ai-studio?tab=tools" onClick={() => setLauncherOpen(false)}>
                    <Sparkles className="h-4 w-4 shrink-0 text-purple-500" aria-hidden />
                    AI Studio tools
                  </Link>
                </Button>
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
                className="grid h-[4.125rem] w-11 min-h-[66px] shrink-0 place-items-center rounded-l-full border border-r-0 border-gold/45 bg-card/80 text-muted-foreground backdrop-blur-sm transition hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                aria-label="Divine shortcuts — plan, tasks, text"
                title="Plan, tasks, text chat"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/divine-manager?section=protocol">
                  <ListTodo className="mr-2 h-4 w-4 text-amber-500" />
                  Today&apos;s plan &amp; protocol
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/divine-manager?section=tasks">
                  <ListTodo className="mr-2 h-4 w-4 text-violet-500" />
                  Manager tasks &amp; suggestions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/divine-manager?section=text">
                  <MessageSquare className="mr-2 h-4 w-4 text-purple-500" />
                  Text Divine
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/divine-manager">
                  <LayoutDashboard className="mr-2 h-4 w-4 text-amber-600" />
                  Divine Manager
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => {
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
            title={divineVoicePremium ? 'Start Divine voice call' : 'Divine voice — Premium required'}
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
        onClick={handleCrownToggleExpand}
        className={crownClassName}
        aria-label={expanded ? 'Collapse Divine voice control' : hasStartedCall ? collapsedCallLabel : 'Expand Divine voice control'}
        title={expanded ? 'Collapse Divine voice control' : hasStartedCall ? collapsedCallLabel : 'Expand Divine voice control'}
      >
        <Crown className="pointer-events-none block h-6 w-6 shrink-0" aria-hidden />
      </button>
    )
  }

  return (
    <>
      <DivineTranscriptStack />
      <div
        className={cn(
          'group/divineFab fixed z-40 flex flex-col items-end gap-2',
          messagesRoute
            ? 'bottom-[max(8.5rem,calc(env(safe-area-inset-bottom)+7.25rem))] right-3 sm:right-5'
            : 'bottom-6 right-6',
        )}
      >
        <DivineProtocolTaskRail />
        <div
          className={cn(
            'flex overflow-hidden rounded-full transition-all duration-300',
            expanded
              ? 'divine-voice-pill-expanded h-auto min-h-[4.125rem] w-[min(92vw,660px)] items-stretch bg-card/95 shadow-lg backdrop-blur-sm'
              : 'h-[4.125rem] min-h-[66px] w-[4.125rem] min-w-[66px] items-center border-0 bg-transparent shadow-none',
          )}
        >
          <div
            className={cn(
              'min-w-0 transition-all duration-300',
              expanded ? 'flex-1 px-3 py-2.5 opacity-100' : 'w-0 px-0 py-0 opacity-0',
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
                <span className="block text-[13px] font-medium leading-snug">Divine voice: {primaryLabel}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
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
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/divine-manager?section=protocol">
                            <ListTodo className="mr-2 h-4 w-4 text-amber-500" />
                            Today&apos;s plan &amp; protocol
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/divine-manager?section=tasks">
                            <ListTodo className="mr-2 h-4 w-4 text-violet-500" />
                            Manager tasks &amp; suggestions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/divine-manager?section=text">
                            <MessageSquare className="mr-2 h-4 w-4 text-purple-500" />
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
