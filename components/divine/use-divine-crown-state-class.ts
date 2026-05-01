'use client'

import { useEffect, useRef, useState } from 'react'
import { useVoiceSession } from '@/components/divine/voice-session-context'

/**
 * Crown FAB colors:
 * - Pill **expanded** during a call: gold / silver / purple / rainbow / red (rich state).
 * - Pill **collapsed** during a call: same **semantic hues as the in-pill Mic** (emerald = live/listening, amber = connecting, red = error).
 * - Idle: Divine Manager–style gold (light) / purple (dark) shimmer on FAB.
 */
export function useDivineCrownStateClass(pillExpanded: boolean): string {
  const voice = useVoiceSession()
  const [recentlyEnded, setRecentlyEnded] = useState(false)
  const prevStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!voice) return
    const prev = prevStatusRef.current
    prevStatusRef.current = voice.status

    if (voice.status === 'idle' && prev !== null && prev !== 'idle') {
      setRecentlyEnded(true)
      const t = window.setTimeout(() => setRecentlyEnded(false), 3500)
      return () => window.clearTimeout(t)
    }
    if (voice.status !== 'idle') setRecentlyEnded(false)
  }, [voice?.status])

  if (!voice) return 'divine-crown-inactive-yellow'

  const { status, voiceSurfaceState, silenceProtocolRainbowActive } = voice

  const collapsedDuringCall = !pillExpanded && status !== 'idle'
  if (collapsedDuringCall) {
    if (silenceProtocolRainbowActive && status === 'connected') return 'divine-crown-rainbow'
    if (status === 'error' || recentlyEnded) return 'divine-crown-mic-error'
    if (status === 'connecting') return 'divine-crown-mic-connecting'
    if (status === 'connected') return 'divine-crown-mic-connected'
  }

  if (status === 'error' || recentlyEnded) return 'divine-crown-ending-red'
  if (silenceProtocolRainbowActive && status === 'connected') return 'divine-crown-rainbow'

  if (status === 'connecting') return 'divine-crown-standby-gold'
  if (status === 'idle') return 'divine-crown-inactive-yellow'

  /* Expanded (or any non-collapsed) call UI: traffic-style RGY — green listen, amber busy/speaking, red error above */
  if (status === 'connected' && voiceSurfaceState === 'working') return 'divine-crown-standby-gold'
  if (status === 'connected' && voiceSurfaceState === 'speaking') return 'divine-crown-standby-gold'
  if (status === 'connected' && voiceSurfaceState === 'idle') return 'divine-crown-listening-silver'

  return 'divine-crown-inactive-yellow'
}
