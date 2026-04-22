'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type MarketingMode = 'simple' | 'pro'

type MarketingModeContextValue = {
  mode: MarketingMode
  setMode: (mode: MarketingMode) => void
}

const MarketingModeContext = createContext<MarketingModeContextValue | null>(null)

type Props = {
  children: ReactNode
  storageKey?: string
  initialMode?: MarketingMode
}

export function MarketingModeProvider({
  children,
  storageKey = 'cv_marketing_mode',
  initialMode = 'simple',
}: Props) {
  const [mode, setMode] = useState<MarketingMode>(initialMode)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(storageKey)
    if (saved === 'simple' || saved === 'pro') setMode(saved)
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, mode)
  }, [mode, storageKey])

  const value = useMemo(() => ({ mode, setMode }), [mode])

  return <MarketingModeContext.Provider value={value}>{children}</MarketingModeContext.Provider>
}

export function useMarketingMode() {
  const ctx = useContext(MarketingModeContext)
  if (!ctx) {
    throw new Error('useMarketingMode must be used within MarketingModeProvider')
  }
  return ctx
}
