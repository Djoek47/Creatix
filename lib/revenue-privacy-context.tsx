'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'circe-venus-hide-revenue'

type RevenuePrivacyContextType = {
  hideRevenue: boolean
  setHideRevenue: (hide: boolean) => void
  toggleRevenueVisibility: () => void
}

const RevenuePrivacyContext = createContext<RevenuePrivacyContextType | null>(null)

export function RevenuePrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hideRevenue, setHideRevenueState] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setHideRevenueState(stored === 'true')
    } catch {
      setHideRevenueState(false)
    }
    setMounted(true)
  }, [])

  const setHideRevenue = useCallback((hide: boolean) => {
    setHideRevenueState(hide)
    try {
      localStorage.setItem(STORAGE_KEY, String(hide))
    } catch {}
  }, [])

  const toggleRevenueVisibility = useCallback(() => {
    setHideRevenueState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  const value: RevenuePrivacyContextType = {
    hideRevenue: mounted ? hideRevenue : false,
    setHideRevenue,
    toggleRevenueVisibility,
  }

  return (
    <RevenuePrivacyContext.Provider value={value}>
      {children}
    </RevenuePrivacyContext.Provider>
  )
}

export function useRevenuePrivacy() {
  const ctx = useContext(RevenuePrivacyContext)
  if (!ctx) {
    return {
      hideRevenue: false,
      setHideRevenue: () => {},
      toggleRevenueVisibility: () => {},
    }
  }
  return ctx
}

const MASK = '••••••'

export function formatRevenue(value: number | string, hide: boolean): string {
  if (hide) return `$${MASK}`
  const n = typeof value === 'string' ? parseFloat(value) || 0 : value
  return `$${n.toLocaleString()}`
}

export function RevenueAmount({
  value,
  className,
  fallback = `$${MASK}`,
}: {
  value: number
  className?: string
  fallback?: string
}) {
  const { hideRevenue } = useRevenuePrivacy()
  const display = hideRevenue ? fallback : `$${value.toLocaleString()}`
  return <span className={className}>{display}</span>
}
