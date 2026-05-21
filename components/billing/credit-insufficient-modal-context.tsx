'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CreditInsufficientCreditsModal } from '@/components/billing/credit-insufficient-modal'

export type CreditInsufficientModalOptions = {
  requiredCredits?: number
  used?: number
  limit?: number
  contextLabel?: string
}

export type CreditInsufficientModalContextValue = {
  openCreditInsufficientModal: (opts?: CreditInsufficientModalOptions) => void
  closeCreditInsufficientModal: () => void
  /** Aliases for plan/API ergonomics */
  open: (opts?: CreditInsufficientModalOptions) => void
  close: () => void
}

const CreditInsufficientModalContext = createContext<CreditInsufficientModalContextValue | null>(
  null,
)

export function CreditInsufficientModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<CreditInsufficientModalOptions>({})

  const openCreditInsufficientModal = useCallback((next?: CreditInsufficientModalOptions) => {
    setOpts(next ?? {})
    setOpen(true)
  }, [])

  const closeCreditInsufficientModal = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({
      openCreditInsufficientModal,
      closeCreditInsufficientModal,
      open: openCreditInsufficientModal,
      close: closeCreditInsufficientModal,
    }),
    [openCreditInsufficientModal, closeCreditInsufficientModal],
  )

  return (
    <CreditInsufficientModalContext.Provider value={value}>
      {children}
      <CreditInsufficientCreditsModal open={open} onOpenChange={setOpen} {...opts} />
    </CreditInsufficientModalContext.Provider>
  )
}

export function useCreditInsufficientModal(): CreditInsufficientModalContextValue {
  const ctx = useContext(CreditInsufficientModalContext)
  if (!ctx) {
    throw new Error('useCreditInsufficientModal must be used within CreditInsufficientModalProvider')
  }
  return ctx
}
