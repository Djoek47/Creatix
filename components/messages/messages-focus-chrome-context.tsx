'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { usePathname } from 'next/navigation'

type MessagesFocusChromeValue = {
  focusMode: boolean
  setFocusMode: Dispatch<SetStateAction<boolean>>
}

const MessagesFocusChromeContext = createContext<MessagesFocusChromeValue | null>(null)

export function MessagesFocusChromeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false)
  const pathname = usePathname() ?? ''

  useEffect(() => {
    if (
      !pathname.startsWith('/dashboard/messages') ||
      pathname.startsWith('/dashboard/messages/mass')
    ) {
      setFocusMode(false)
    }
  }, [pathname])

  const value = useMemo(() => ({ focusMode, setFocusMode }), [focusMode])

  return (
    <MessagesFocusChromeContext.Provider value={value}>{children}</MessagesFocusChromeContext.Provider>
  )
}

export function useMessagesFocusChrome(): MessagesFocusChromeValue {
  const ctx = useContext(MessagesFocusChromeContext)
  if (!ctx) {
    throw new Error('useMessagesFocusChrome must be used within MessagesFocusChromeProvider')
  }
  return ctx
}

/** Safe for optional UI (e.g. route hero) when provider might not wrap legacy paths. */
export function useMessagesFocusChromeOptional(): MessagesFocusChromeValue | null {
  return useContext(MessagesFocusChromeContext)
}
