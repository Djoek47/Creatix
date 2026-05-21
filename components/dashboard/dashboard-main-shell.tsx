'use client'

import type { ReactNode } from 'react'
import { DashboardRouteHero } from '@/components/dashboard/dashboard-route-hero'
import { RevenueBandMismatchBanner } from '@/components/dashboard/revenue-band-mismatch-banner'

export function DashboardMainShell({ children }: { children: ReactNode }) {
  return (
    <main id="dashboard-main-shell" data-divine-page-context>
      <RevenueBandMismatchBanner />
      <DashboardRouteHero />
      {children}
    </main>
  )
}
