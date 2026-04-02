'use client'

import { useEffect, useState } from 'react'
import { useVoiceSession } from '@/components/divine/voice-session-context'

/**
 * Same visual state classes as the Divine crown button: idle (gold fluctuate),
 * live (green), working/tools (purple), ending/error (red).
 */
export function useDivineCrownStateClass(): string {
  const voice = useVoiceSession()
  const [recentlyEnded, setRecentlyEnded] = useState(false)

  useEffect(() => {
    if (!voice) return
    if (voice.status === 'idle') {
      setRecentlyEnded(true)
      const t = window.setTimeout(() => setRecentlyEnded(false), 3500)
      return () => window.clearTimeout(t)
    }
    setRecentlyEnded(false)
  }, [voice?.status])

  if (!voice) return 'divine-crown-fluctuate'

  const { status, voiceSurfaceState } = voice
  const isActive = status === 'connected' || status === 'connecting'

  if (status === 'error' || recentlyEnded) return 'divine-crown-ending-red'
  if (status === 'connected' && voiceSurfaceState === 'working') return 'divine-crown-live-purple'
  if (isActive) return 'divine-crown-live-green'
  return 'divine-crown-fluctuate'
}
