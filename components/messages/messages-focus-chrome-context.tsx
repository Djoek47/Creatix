'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { usePathname } from 'next/navigation'

const WORKSPACE_BAR_COLLAPSED_KEY = 'creatix-messages-workspace-bar-collapsed'
const MOBILE_BREAKPOINT = 768

type MessagesFocusChromeValue = {
  focusMode: boolean
  setFocusMode: Dispatch<SetStateAction<boolean>>
  /** Hides the global dashboard header (Tools, search, avatar) on the messages inbox for more composer space. */
  workspaceBarCollapsed: boolean
  setWorkspaceBarCollapsed: Dispatch<SetStateAction<boolean>>
}

const MessagesFocusChromeContext = createContext<MessagesFocusChromeValue | null>(null)

export function MessagesFocusChromeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false)
  const [workspaceBarCollapsed, setWorkspaceBarCollapsed] = useState(false)
  const pathname = usePathname() ?? ''
  const didAutoCollapseMobileMessagesRef = useRef(false)

  useEffect(() => {
    if (
      !pathname.startsWith('/dashboard/messages') ||
      pathname.startsWith('/dashboard/messages/mass')
    ) {
      setFocusMode(false)
    }
  }, [pathname])

  /** Message-first mobile: hide the global workspace header by default (user can show from strip or overflow). */
  useEffect(() => {
    const onMessagesInbox =
      pathname.startsWith('/dashboard/messages') && !pathname.startsWith('/dashboard/messages/mass')
    if (!onMessagesInbox || didAutoCollapseMobileMessagesRef.current) return
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(WORKSPACE_BAR_COLLAPSED_KEY) === '0') {
        didAutoCollapseMobileMessagesRef.current = true
        return
      }
    } catch {
      /* ignore */
    }
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setWorkspaceBarCollapsed(true)
      didAutoCollapseMobileMessagesRef.current = true
    }
  }, [pathname])

  useEffect(() => {
    try {
      if (window.localStorage.getItem(WORKSPACE_BAR_COLLAPSED_KEY) === '1') {
        setWorkspaceBarCollapsed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(WORKSPACE_BAR_COLLAPSED_KEY, workspaceBarCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [workspaceBarCollapsed])

  const value = useMemo(
    () => ({ focusMode, setFocusMode, workspaceBarCollapsed, setWorkspaceBarCollapsed }),
    [focusMode, workspaceBarCollapsed],
  )

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
