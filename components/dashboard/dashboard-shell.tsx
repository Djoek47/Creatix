'use client'

import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface DashboardShellProps {
  user: User
  profile: Profile | null
  children: React.ReactNode
}

export function DashboardShell({ user, profile, children }: DashboardShellProps) {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--primary)_0.06,transparent_50%)]" aria-hidden />
      <DashboardSidebar
        user={user}
        profile={profile}
        isMobile={isMobile}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <DashboardHeader
          user={user}
          profile={profile}
          onMenuClick={isMobile ? () => setSidebarOpen(true) : undefined}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
