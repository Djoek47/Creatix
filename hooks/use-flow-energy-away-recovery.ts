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

    const boosted = energyAfterRestAway(flowState.energy, awayMsForSession)
    if (boosted === flowState.energy) return flowState

    const v2 = process.env.NEXT_PUBLIC_WELLBEING_FLOW_V2 === '1'
    const delta = boosted - flowState.energy
    let dampen = 1
    if (v2) {
      dampen = flowState.energy >= 68 ? 0.42 : 0.72
    }
    const energy = Math.round(Math.min(100, Math.max(0, flowState.energy + delta * dampen)))
    return { ...flowState, energy }
  }, [flowState, awayMsForSession])
}
