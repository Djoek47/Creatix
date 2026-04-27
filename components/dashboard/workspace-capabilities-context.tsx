'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { WorkspaceCapabilities } from '@/lib/plan-capabilities'

const WorkspaceCapabilitiesContext = createContext<WorkspaceCapabilities | null>(null)

export function WorkspaceCapabilitiesProvider({
  value,
  children,
}: {
  value: WorkspaceCapabilities
  children: ReactNode
}) {
  return (
    <WorkspaceCapabilitiesContext.Provider value={value}>{children}</WorkspaceCapabilitiesContext.Provider>
  )
}

export function useWorkspaceCapabilities(): WorkspaceCapabilities {
  const ctx = useContext(WorkspaceCapabilitiesContext)
  if (!ctx) {
    throw new Error('useWorkspaceCapabilities must be used within WorkspaceCapabilitiesProvider')
  }
  return ctx
}
