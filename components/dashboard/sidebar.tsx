'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Shield,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { BrandTitle } from '@/components/dashboard/brand-title'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface SidebarProps {
  user: User
  profile: Profile | null
  isMobile?: boolean
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Sparkles, highlight: true },
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Content', href: '/dashboard/content', icon: Calendar },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
  { name: 'Mentions', href: '/dashboard/mentions', icon: Bell },
  { name: 'Connect', href: '/dashboard/connect', icon: Link2 },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

function SidebarContent({
  profile,
  pathname,
  collapsed,
  showCollapse,
  onCollapseToggle,
}: {
  profile: Profile | null
  pathname: string
  collapsed: boolean
  showCollapse: boolean
  onCollapseToggle?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4 shrink-0">
        <BrandLogo width={32} height={32} className="h-8 w-8 flex-shrink-0" />
        {!collapsed && (
          <BrandTitle variant="sidebar" className="text-lg" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isHighlight = 'highlight' in item && item.highlight
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors tap-target',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : isHighlight
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', (isActive || isHighlight) && 'text-primary')} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors tap-target',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {/* User info */}
        {!collapsed && profile && (
          <div className="mt-2 rounded-lg bg-sidebar-accent/30 p-3">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile.full_name || 'Creator'}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {profile.email}
            </p>
          </div>
        )}
      </div>

      {/* Collapse Button (desktop only) */}
      {showCollapse && onCollapseToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-[4.25rem] h-6 w-6 rounded-full border border-sidebar-border bg-sidebar tap-target z-10 -translate-x-1/2"
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      )}
    </>
  )
}

export function DashboardSidebar({
  user,
  profile,
  isMobile = false,
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (isMobile && mobileOpen) onMobileOpenChange?.(false)
  }, [pathname, isMobile, mobileOpen, onMobileOpenChange])

  const content = (
    <SidebarContent
      profile={profile}
      pathname={pathname}
      collapsed={collapsed}
      showCollapse={!isMobile}
      onCollapseToggle={isMobile ? undefined : () => setCollapsed(!collapsed)}
    />
  )

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 gap-0 bg-sidebar/95 backdrop-blur-xl border-sidebar-border">
          <div className="flex flex-col h-full">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={cn(
        'relative hidden md:flex flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl transition-all duration-300 shrink-0 animate-glass-shimmer transition-brand pr-1',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {content}
    </aside>
  )
}
