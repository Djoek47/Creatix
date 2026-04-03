'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { DivineWorkingLogo } from '@/components/divine/divine-working-logo'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Crown, Mic, PhoneOff, MessageSquare, Sparkles, LayoutDashboard } from 'lucide-react'
import { DivineTranscriptStack } from '@/components/divine/divine-transcript-card'
import { useDivineCrownStateClass } from '@/components/divine/use-divine-crown-state-class'
import { DivineProtocolTaskRail } from '@/components/divine/divine-protocol-task-rail'

export function VoiceControlPopup() {
  const voice = useVoiceSession()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [skipLauncher, setSkipLauncher] = useState(false)
  const crownStateClass = useDivineCrownStateClass()

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
    if (isActive) setExpanded(true)
    if (!hasStartedCall) setExpanded(false)
  }, [voice, isActive, hasStartedCall])

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
    'divine-fab-crown divine-crown-trigger grid h-[4.125rem] w-[4.125rem] min-h-[66px] min-w-[66px] shrink-0 place-items-center p-0 leading-none text-[#1a1200] transition',
    expanded ? 'rounded-none border-l border-gold/45' : 'rounded-full border border-gold/45 shadow-lg',
    crownStateClass,
    'hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-0',
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
              <Button
                className="w-full gap-2 bg-gradient-to-r from-amber-600 to-purple-600 text-white hover:from-amber-500 hover:to-purple-500"
                onClick={() => {
                  void startVoiceFromLauncher()
                }}
              >
                <Mic className="h-4 w-4 shrink-0" aria-hidden />
                Start voice call
              </Button>
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
        <button
          type="button"
          onClick={() => {
            void handleCrownClickInstant()
          }}
          className={crownClassName}
          aria-label="Start Divine voice call"
          title="Start Divine voice call"
        >
          <Crown className="pointer-events-none block h-6 w-6 shrink-0" aria-hidden />
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={handleCrownToggleExpand}
        className={crownClassName}
        aria-label={expanded ? 'Collapse Divine voice control' : 'Expand Divine voice control'}
        title={expanded ? 'Collapse Divine voice control' : 'Expand Divine voice control'}
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
            'flex h-[4.125rem] min-h-[66px] items-center overflow-hidden rounded-full transition-all duration-300',
            expanded
              ? 'divine-voice-pill-expanded w-[min(92vw,660px)] bg-card/95 shadow-lg backdrop-blur-sm'
              : 'h-[4.125rem] w-[4.125rem] min-h-[66px] min-w-[66px] border-0 bg-transparent shadow-none',
          )}
        >
          <div
            className={cn(
              'min-w-0 transition-all duration-300',
              expanded ? 'w-full px-3 py-2 opacity-100' : 'w-0 px-0 py-0 opacity-0',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
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
                <span className="block text-[13px] font-medium leading-tight">Divine voice: {primaryLabel}</span>
                <span className="block text-xs text-muted-foreground leading-tight">
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
                className="hidden rounded-md bg-muted sm:block"
              />
              {!isActive ? (
                <Button size="sm" className="h-8 text-xs" onClick={() => { void startVoiceCall() }}>
                  Start call
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-1">
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
