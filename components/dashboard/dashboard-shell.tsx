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
    <div className="min-h-screen brand-bg flex flex-col">
      <DashboardHeader
        user={user}
        profile={profile}
        onMenuClick={isMobile ? () => setSidebarOpen(true) : undefined}
      />
      <main className="flex-1 container mx-auto px-4 py-8 animate-page-enter">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      {/* Sidebar: drawer on mobile only (Visual has no sidebar; we keep it for nav) */}
      <DashboardSidebar
        user={user}
        profile={profile}
        isMobile={isMobile}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
      />
    </div>
    </RevenuePrivacyProvider>
  )
}
