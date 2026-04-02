'use client'

import type { ReactNode } from 'react'
import { DashboardRouteHero } from '@/components/dashboard/dashboard-route-hero'

export function DashboardMainShell({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardRouteHero />
      {children}
    </>
  )
}
