'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { RevenuePrivacyProvider } from '@/lib/revenue-privacy-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface DashboardShellProps {
  user: User
  profile: Profile | null
  hasConnectedPlatform?: boolean
  children: React.ReactNode
}

export function DashboardShell({ user, profile, hasConnectedPlatform = true, children }: DashboardShellProps) {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (hasConnectedPlatform === false && pathname !== '/dashboard/connect') {
      router.replace('/dashboard/connect')
    }
  }, [hasConnectedPlatform, pathname, router])

  return (
    <RevenuePrivacyProvider>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 animate-page-enter">
          {children}
        </main>
      </div>
    </div>
    </RevenuePrivacyProvider>
  )
}
