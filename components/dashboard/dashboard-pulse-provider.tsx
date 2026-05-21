'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PulsePayload } from '@/lib/wellbeing/pulse-engine'
import { writeFlowTabHiddenTimestamp } from '@/lib/wellbeing/energy-away-recovery'

type CacheMeta = { hit: boolean; ttlSec: number; ageSec: number }

export type DashboardPulseContextValue = {
  pulse: PulsePayload | null
  loading: boolean
  error: string | null
  refresh: (force?: boolean) => Promise<void>
  cache: CacheMeta | null
}

const DashboardPulseContext = createContext<DashboardPulseContextValue | null>(null)

export function DashboardPulseProvider({ children }: { children: ReactNode }) {
  const [pulse, setPulse] = useState<PulsePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cache, setCache] = useState<CacheMeta | null>(null)

  const refresh = useCallback(async (force = false) => {
    setError(null)
    try {
      const url = force ? '/api/wellbeing/pulse?force=1' : '/api/wellbeing/pulse'
      const res = await fetch(url, { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as {
        pulse?: PulsePayload
        error?: string
        cache?: CacheMeta
      }
      if (!res.ok) {
        setPulse(null)
        setError(typeof json.error === 'string' ? json.error : 'Pulse unavailable')
        return
      }
      if (json.pulse) {
        setPulse(json.pulse)
        setCache(json.cache ?? null)
      }
    } catch {
      setError('Pulse unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useEffect(() => {
    const intervalMs = 5 * 60 * 1000
    const id = window.setInterval(() => void refresh(false), intervalMs)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        writeFlowTabHiddenTimestamp()
        return
      }
      void refresh(false)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  useEffect(() => {
    const sev = pulse?.severity ?? ''
    if (sev) document.documentElement.dataset.pulseSeverity = sev
    else delete document.documentElement.dataset.pulseSeverity
    return () => {
      delete document.documentElement.dataset.pulseSeverity
    }
  }, [pulse?.severity])

  const value = useMemo(
    (): DashboardPulseContextValue => ({ pulse, loading, error, refresh, cache }),
    [pulse, loading, error, refresh, cache],
  )

  return <DashboardPulseContext.Provider value={value}>{children}</DashboardPulseContext.Provider>
}

export function useDashboardPulse(): DashboardPulseContextValue {
  const ctx = useContext(DashboardPulseContext)
  if (!ctx) {
    throw new Error('useDashboardPulse must be used within DashboardPulseProvider')
  }
  return ctx
}

export function useDashboardPulseOptional(): DashboardPulseContextValue | null {
  return useContext(DashboardPulseContext)
}
