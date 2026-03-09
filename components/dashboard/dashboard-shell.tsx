'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { RevenuePrivacyProvider } from '@/lib/revenue-privacy-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardPageTitle } from '@/components/dashboard/dashboard-page-title'
import { MobileNav } from '@/components/dashboard/mobile-nav'
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
      />
      {/* Above: header + main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          user={user}
          profile={profile}
          isMobile={isMobile}
        />
        <main className="flex-1 container mx-auto px-4 pt-6 pb-24 md:py-8 animate-page-enter">
          <div className="max-w-6xl mx-auto">
            <DashboardPageTitle />
            {children}
          </div>
        </main>
        {/* Mobile bottom navigation replaces hamburger+drawer */}
        {isMobile && <MobileNav />}
      </div>
    </div>
    </RevenuePrivacyProvider>
  )
}
