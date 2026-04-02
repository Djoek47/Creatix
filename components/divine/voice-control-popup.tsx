'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { DivineWorkingLogo } from '@/components/divine/divine-working-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Crown, Mic, PhoneOff } from 'lucide-react'
import { DivineTranscriptStack } from '@/components/divine/divine-transcript-card'
import { useDivineCrownStateClass } from '@/components/divine/use-divine-crown-state-class'

export function VoiceControlPopup() {
  const voice = useVoiceSession()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const crownStateClass = useDivineCrownStateClass()

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
  const messagesOnlyMode = pathname?.startsWith('/dashboard/messages') === true

  const primaryLabel =
    status === 'idle'
      ? 'Idle'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'connected'
          ? 'Listening'
          : 'Error'

  const handleCrownClick = async () => {
    if (status === 'idle') {
      setExpanded(true)
      await startVoiceCall()
      return
    }
    setExpanded((prev) => !prev)
  }

  return (
    <>
      <DivineTranscriptStack />
      {/* Divine voice crown FAB: Messages only (composer zone); not shown on Dashboard or other routes */}
      {messagesOnlyMode && (
      <div
        className={cn(
          'fixed z-40 flex flex-col items-end gap-2',
          'bottom-[max(7.25rem,calc(env(safe-area-inset-bottom)+6.25rem))] right-3 sm:right-5',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center overflow-hidden rounded-full transition-all duration-300',
            expanded
              ? 'w-[min(92vw,560px)] border border-border bg-card/95 shadow-lg backdrop-blur-sm'
              : 'w-14 border-0 bg-transparent shadow-none',
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
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  status === 'error'
                    ? 'bg-red-500/10 text-red-500'
                    : status === 'connecting'
                      ? 'bg-amber-500/10 text-amber-500'
                      : isActive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground',
                )}
              >
                <Mic className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium">Divine voice: {primaryLabel}</span>
                <span className="block text-[11px] text-muted-foreground">
                  You can keep browsing; call stays active.
                </span>
                <DivineWorkingLogo variant={isActive ? voiceSurfaceState : 'idle'} className="mt-0.5" />
              </div>
              <canvas
                ref={voiceVizRef}
                width={80}
                height={28}
                className="hidden rounded-md bg-muted sm:block"
              />
              {!isActive ? (
                <Button size="sm" className="h-7 text-xs" onClick={() => { void startVoiceCall() }}>
                  Start call
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
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
              <span className="mt-1 block max-w-[280px] truncate text-[10px] text-destructive">{error}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => { void handleCrownClick() }}
            className={cn(
              'divine-crown-trigger grid h-14 w-14 shrink-0 place-items-center p-0 leading-none text-[#1a1200] transition',
              expanded ? 'rounded-none border-l border-gold/45' : 'rounded-full border border-gold/45 shadow-lg',
              crownStateClass,
              'hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-0',
            )}
            aria-label={status === 'idle' ? 'Start Divine voice call' : expanded ? 'Collapse Divine voice control' : 'Expand Divine voice control'}
            title={status === 'idle' ? 'Start Divine voice call' : expanded ? 'Collapse Divine voice control' : 'Expand Divine voice control'}
          >
            <Crown className="pointer-events-none block h-5 w-5 shrink-0" aria-hidden />
          </button>
        </div>
      </div>
      )}
    </>
  )
}

