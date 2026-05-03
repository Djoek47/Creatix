'use client'

import { useCallback, useEffect, useState } from 'react'

export type CreditWalletSnapshot = {
  totalRemaining: number
  includedRemaining: number
  purchasedRemaining: number
  /** Unused trial included credits banked until next paid/protection grant. */
  bankedTrialCredits: number
}

type ApiShape = {
  wallet?: {
    totalRemaining?: number
    includedRemaining?: number
    purchasedRemaining?: number
    bankedTrialCredits?: number
  }
}

/**
 * Shared wallet read for any feature that gates on credits (scans, tools, chat, etc.).
 */
export function useCreditSnapshot() {
  const [wallet, setWallet] = useState<CreditWalletSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/billing/credit-snapshot', { credentials: 'include' })
      if (!res.ok) {
        setError('Could not load credits')
        setLoading(false)
        return
      }
      const data = (await res.json().catch(() => ({}))) as ApiShape
      const w = data.wallet
      setWallet({
        totalRemaining: Number(w?.totalRemaining ?? 0),
        includedRemaining: Number(w?.includedRemaining ?? 0),
        purchasedRemaining: Number(w?.purchasedRemaining ?? 0),
        bankedTrialCredits: Math.max(0, Math.floor(Number(w?.bankedTrialCredits ?? 0))),
      })
    } catch {
      setError('Could not load credits')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { wallet, loading, error, refresh }
}
