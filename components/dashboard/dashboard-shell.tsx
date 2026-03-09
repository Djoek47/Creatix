'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { RevenuePrivacyProvider } from '@/lib/revenue-privacy-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardPageTitle } from '@/components/dashboard/dashboard-page-title'
import { Menu } from 'lucide-react'
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
    <div className="min-h-screen brand-bg flex flex-col md:flex-row">
      {/* Side: sidebar on desktop; drawer on mobile */}
      <DashboardSidebar
        user={user}
        profile={profile}
        isMobile={isMobile}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
      />
      {/* Above: header + main content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile menu trigger: outside header so nothing blocks touch in portrait (iOS Safari) */}
        {isMobile && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setSidebarOpen((open) => !open)}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSidebarOpen((open) => !open)
            }}
            onTouchStart={(e) => e.stopPropagation()}
            className="fixed left-0 top-0 z-[60] flex h-20 w-20 min-h-[64px] min-w-[64px] cursor-pointer items-center justify-center touch-manipulation md:hidden border-0 bg-transparent"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
            }}
          >
            <Menu className="h-7 w-7" aria-hidden />
          </button>
        )}
        <DashboardHeader
          user={user}
          profile={profile}
          onMenuClick={isMobile ? undefined : () => setSidebarOpen((open) => !open)}
          isMobile={isMobile}
        />
        <main className="flex-1 container mx-auto px-4 py-8 animate-page-enter">
          <div className="max-w-6xl mx-auto">
            <DashboardPageTitle />
            {children}
          </div>
        </main>
      </div>
    </div>
    </RevenuePrivacyProvider>
  )
}
