'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemedLogo } from '@/components/themed-logo'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Shield,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Star,
  Share2,
  BookOpen,
  Crown,
  LucideIcon,
  Library,
  Lightbulb,
  HeartPulse,
  MessagesSquare,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface SidebarProps {
  user: User
  profile: Profile | null
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

// Circe's domain - Retention, Analytics, Protection (Purple)
const circeNavigation: NavItem[] = [
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Retention', href: '/dashboard/retention/churn', icon: Activity },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
]

// Venus's domain - Growth, Attraction, Reputation (White)
const venusNavigation: NavItem[] = [
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Housekeeping', href: '/dashboard/commenter', icon: MessagesSquare },
  { name: 'Mentions', href: '/dashboard/mentions', icon: TrendingUp },
]

// Silver themed navigation
const silverNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Divine Manager', href: '/dashboard/divine-manager', icon: Crown },
  { name: 'Content', href: '/dashboard/content', icon: Calendar },
  { name: 'Well-being', href: '/dashboard/well-being', icon: HeartPulse },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Social', href: '/dashboard/social', icon: Share2 },
  { name: 'Content library', href: '/dashboard/content-library', icon: Library },
]

// AI Studio — gold/purple glow idle; rainbow gradient on hover
const aiStudioNavigation: NavItem[] = [
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation: NavItem[] = [
  { name: 'Community', href: '/dashboard/community', icon: Lightbulb },
  { name: 'Guide', href: '/dashboard/guide', icon: BookOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const variantStyles = {
  default: {
    // Black in light mode, white/silver in dark mode
    active: 'bg-sidebar-accent text-sidebar-foreground',
    inactive: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
    icon: 'text-sidebar-foreground'
  },
  circe: {
    active: 'bg-circe/20 text-circe-light',
    inactive: 'text-sidebar-foreground/70 hover:bg-circe/10 hover:text-circe-light',
    icon: 'text-circe-light'
  },
  venus: {
    // Gold on hover only (idle matches default sidebar; active = full gold)
    active: 'bg-gold/20 text-gold',
    inactive: 'text-sidebar-foreground/70 hover:bg-gold/10 hover:text-gold',
    icon: 'text-gold'
  },
  'ai-studio': {
    // Gold + purple glow idle; rainbow animated gradient on hover (group-hover)
    active:
      'group relative overflow-hidden transition-all duration-300 ' +
      'bg-gradient-to-r from-amber-500/12 via-purple-500/15 to-violet-600/18 ' +
      'shadow-[inset_0_0_0_1px_rgba(251,191,36,0.28),0_0_14px_-2px_rgba(251,191,36,0.28),0_0_22px_-4px_rgba(168,85,247,0.38)] ' +
      'hover:bg-gradient-to-r hover:from-pink-500/22 hover:via-fuchsia-500/22 hover:to-cyan-500/18 ' +
      'hover:bg-[length:200%_200%] hover:animate-gradient-x ' +
      'hover:shadow-[0_0_18px_rgba(236,72,153,0.42),0_0_24px_rgba(168,85,247,0.38),0_0_26px_rgba(34,211,238,0.32),0_0_16px_rgba(251,191,36,0.28)]',
    inactive:
      'group relative overflow-hidden transition-all duration-300 ' +
      'bg-gradient-to-r from-amber-500/8 via-transparent to-purple-500/12 ' +
      'shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2),0_0_12px_-2px_rgba(251,191,36,0.22),0_0_18px_-4px_rgba(147,51,234,0.28)] ' +
      'hover:bg-gradient-to-r hover:from-pink-500/18 hover:via-purple-500/18 hover:to-cyan-500/15 ' +
      'hover:bg-[length:200%_200%] hover:animate-gradient-x ' +
      'hover:shadow-[0_0_16px_rgba(236,72,153,0.38),0_0_22px_rgba(168,85,247,0.34),0_0_24px_rgba(34,211,238,0.28)]',
    icon: 'text-amber-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.55)] group-hover:text-purple-200 group-hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.45)]'
  }
} as const

type NavVariant = keyof typeof variantStyles

function NavLink({ 
  item, 
  variant = 'default', 
  pathname, 
  collapsed 
}: { 
  item: NavItem
  variant?: NavVariant
  pathname: string
  collapsed: boolean
}) {
  const isActive =
    item.href === '/dashboard/fans'
      ? pathname === '/dashboard/fans'
      : pathname === item.href || pathname.startsWith(item.href + '/')
  const isAiStudio = variant === 'ai-studio'
  const styles = variantStyles[variant]
  const Icon = item.icon
  
  return (
    <Link
      href={item.href}
      data-tour={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive ? styles.active : styles.inactive
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 flex-shrink-0',
          isAiStudio ? cn(styles.icon, 'transition-all duration-300 group-hover:animate-hue-rotate') : isActive && styles.icon,
        )}
      />
      {!collapsed && (
        <span
          className={cn(
            isAiStudio &&
              'bg-gradient-to-r from-amber-500 via-purple-500 to-violet-500 bg-clip-text text-transparent transition-all duration-300 ' +
                'group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-cyan-500 group-hover:bg-[length:200%_200%] group-hover:animate-gradient-x',
            isAiStudio && !isActive && 'opacity-90',
          )}
        >
          {item.name}
        </span>
      )}
    </Link>
  )
}

export function DashboardSidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isMessagesRoute = pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')

  useEffect(() => {
    if (isMessagesRoute) setCollapsed(true)
  }, [isMessagesRoute])

  useEffect(() => {
    const onOpenChatsMenu = () => {
      if (isMessagesRoute) setCollapsed(true)
    }
    window.addEventListener('messages:open-chats-menu', onOpenChatsMenu as EventListener)
    return () => {
      window.removeEventListener('messages:open-chats-menu', onOpenChatsMenu as EventListener)
    }
  }, [isMessagesRoute])

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <ThemedLogo 
          width={32} 
          height={32} 
          className="flex-shrink-0 rounded-full"
          priority
        />
        {!collapsed && (
          <span className="font-serif text-sm font-semibold tracking-wider text-primary dark:text-circe-light">
            CIRCE ET VENUS
          </span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-2">
        {/* Dashboard, Content, Messages - Black light/White dark */}
        <div className="space-y-1">
          {silverNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="default" pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        {/* AI Studio — gold + purple glow; rainbow on hover */}
        <div className="space-y-1">
          {aiStudioNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="ai-studio" pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        {/* Circe's Domain */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2">
              <Moon className="h-4 w-4 text-circe-light" />
              <span className="text-xs font-medium uppercase tracking-wider text-circe-light/70">
                Circe
              </span>
            </div>
          )}
          {circeNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="circe" pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        {/* Venus's Domain */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2">
              <Sun className="h-4 w-4 text-gold" />
              <span className="text-xs font-medium uppercase tracking-wider text-gold/70">
                Venus
              </span>
            </div>
          )}
          {venusNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="venus" pathname={pathname} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-sidebar-border p-2">
        {bottomNavigation.map((item) => (
          <NavLink key={item.name} item={item} variant="default" pathname={pathname} collapsed={collapsed} />
        ))}

        {/* User info - Gold in light mode, Purple in dark mode */}
        {!collapsed && profile && (
          <div className="mt-2 rounded-lg bg-sidebar-accent/30 p-3">
            <p className="truncate text-sm font-medium text-amber-600 dark:text-circe-light">
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-xs text-amber-600/70 dark:text-circe-light/70">
              {profile.email}
            </p>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar"
        onClick={() => {
          const next = !collapsed
          setCollapsed(next)
          if (!next && isMessagesRoute) {
            window.dispatchEvent(new CustomEvent('dashboard:left-sidebar-expanded'))
          }
        }}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  )
}
