'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FlowStatePayload } from '@/lib/wellbeing/flow-state-ai'
import {
  clearFlowTabHiddenTimestamp,
  energyAfterRestAway,
  readFlowTabHiddenTimestamp,
  writeFlowTabHiddenTimestamp,
} from '@/lib/wellbeing/energy-away-recovery'

/**
 * Tracks tab visibility and boosts displayed flow energy after meaningful time away
 * (tab hidden / minimized), so returning to Well-being reads as more rested.
 */
export function useFlowEnergyAwayRecovery(flowState: FlowStatePayload | null): FlowStatePayload | null {
  const [awayMsForSession, setAwayMsForSession] = useState(0)

  useEffect(() => {
    const applyVisibleAway = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
      const hiddenAt = readFlowTabHiddenTimestamp()
      if (hiddenAt == null) return
      const away = Math.max(0, Date.now() - hiddenAt)
      clearFlowTabHiddenTimestamp()
      setAwayMsForSession(away)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setAwayMsForSession(0)
        writeFlowTabHiddenTimestamp()
        return
      }
      applyVisibleAway()
    }

    applyVisibleAway()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return useMemo(() => {
    if (!flowState) return null
    if (awayMsForSession <= 0) return flowState
    const energy = energyAfterRestAway(flowState.energy, awayMsForSession)
    if (energy === flowState.energy) return flowState
    return { ...flowState, energy }
  }, [flowState, awayMsForSession])
}
