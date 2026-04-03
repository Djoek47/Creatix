'use client'

import { useEffect, useRef, useState } from 'react'
import { useVoiceSession } from '@/components/divine/voice-session-context'

/**
 * Crown FAB colors: yellow = inactive (no call), gold = standby / Divine speaking,
 * silver = connected mic idle, purple = tools/model work, red = ended or error,
 * rainbow = final 30s of the 47s+60s silence protocol before the mic/end prompt.
 */
export function useDivineCrownStateClass(): string {
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

  if (status === 'error' || recentlyEnded) return 'divine-crown-ending-red'
  if (silenceProtocolRainbowActive && status === 'connected') return 'divine-crown-rainbow'

  if (status === 'connecting') return 'divine-crown-standby-gold'
  if (status === 'idle') return 'divine-crown-inactive-yellow'

  if (status === 'connected' && voiceSurfaceState === 'working') return 'divine-crown-live-purple'
  if (status === 'connected' && voiceSurfaceState === 'speaking') return 'divine-crown-standby-gold'
  if (status === 'connected' && voiceSurfaceState === 'idle') return 'divine-crown-listening-silver'

  return 'divine-crown-inactive-yellow'
}
