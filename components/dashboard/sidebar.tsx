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
import { triggerDashboardRealmEntrance } from '@/components/dashboard/dashboard-realm-entrance'
import { useWorkspaceCapabilities } from '@/components/dashboard/workspace-capabilities-context'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'

interface SidebarProps {
  user: User
  profile: Profile | null
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  beta?: boolean
}

// Circe's domain (Purple) — all items always visible
const circeNavigation: NavItem[] = [
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
  { name: 'Retention', href: '/dashboard/retention/churn', icon: Activity },
]

// Venus's domain (Gold) — all items always visible
const venusNavigation: NavItem[] = [
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Mentions', href: '/dashboard/mentions', icon: TrendingUp },
  { name: 'Housekeeping', href: '/dashboard/commenter', icon: MessagesSquare },
]

/** Base desktop rail sizing (keeps current look on roomy screens). */
const SIDEBAR_SIZE = {
  cozy: {
    linkText: 'text-[0.95rem] leading-snug',
    iconBox: 'h-[1.125rem] w-[1.125rem]',
    sectionLabel: 'text-[0.7rem]',
  },
  compact: {
    linkText: 'text-[0.875rem] leading-snug',
    iconBox: 'h-4 w-4',
    sectionLabel: 'text-[0.66rem]',
  },
} as const

// Silver themed navigation
const silverNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Divine Manager', href: '/dashboard/divine-manager', icon: Crown },
  { name: 'Content Calendar', href: '/dashboard/content', icon: Calendar },
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
  { name: 'Community', href: '/dashboard/community', icon: Lightbulb, beta: true },
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
  collapsed,
  compactDensity,
}: { 
  item: NavItem
  variant?: NavVariant
  pathname: string
  collapsed: boolean
  compactDensity: boolean
}) {
  const isActive =
    item.href === '/dashboard/fans'
      ? pathname === '/dashboard/fans'
      : pathname === item.href || pathname.startsWith(item.href + '/')
  const isAiStudio = variant === 'ai-studio'
  const styles = variantStyles[variant]
  const Icon = item.icon

  const linkClassName = cn(
    'group flex min-h-9 items-center font-medium transition-colors',
    compactDensity ? SIDEBAR_SIZE.compact.linkText : SIDEBAR_SIZE.cozy.linkText,
    collapsed
      ? 'relative justify-center overflow-visible gap-0 rounded-md px-2 py-2'
      : 'gap-2.5 rounded-md px-2.5 py-2',
    isActive ? styles.active : styles.inactive,
  )

  const linkInner = (
    <>
      {collapsed && (
        <span
          className="sidebar-nav-collapsed-glow pointer-events-none absolute inset-0 z-0 rounded-md"
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          'relative z-[1] flex-shrink-0',
          compactDensity ? SIDEBAR_SIZE.compact.iconBox : SIDEBAR_SIZE.cozy.iconBox,
          isAiStudio
            ? cn(styles.icon, 'transition-all duration-300 group-hover:animate-hue-rotate')
            : isActive && styles.icon,
        )}
      />
      {!collapsed && (
        <div className="flex min-w-0 items-center gap-2">
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
          {item.beta ? (
            <span className="rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0 text-[0.7rem] uppercase leading-none tracking-wide text-amber-500">
              Beta
            </span>
          ) : null}
        </div>
      )}
    </>
  )

  if (collapsed) {
    return (
      <TooltipPrimitive.Root delayDuration={0}>
        <TooltipPrimitive.Trigger asChild>
          <Link
            href={item.href}
            data-tour={item.href}
            className={linkClassName}
          >
            {linkInner}
          </Link>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            sideOffset={8}
            className={cn(
              'z-50 max-w-[16rem] origin-(--radix-tooltip-content-transform-origin) rounded-md border border-amber-500/25 bg-background/95 px-2.5 py-1.5 text-xs text-foreground shadow-lg backdrop-blur-sm',
              'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=right]:slide-in-from-left-2',
            )}
          >
            <span className="font-medium">{item.name}</span>
            {item.beta ? (
              <span className="ml-1.5 text-[0.65rem] uppercase tracking-wide text-amber-500/90">
                Beta
              </span>
            ) : null}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    )
  }

  return (
    <Link
      href={item.href}
      data-tour={item.href}
      className={linkClassName}
    >
      {linkInner}
    </Link>
  )
}

export function DashboardSidebar({ profile }: SidebarProps) {
  const caps = useWorkspaceCapabilities()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [compactDensity, setCompactDensity] = useState(false)
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

  useEffect(() => {
    const checkDensity = () => {
      const shortScreen = window.innerHeight < 860
      const narrowScreen = window.innerWidth < 1320
      setCompactDensity(shortScreen || narrowScreen)
    }
    checkDensity()
    window.addEventListener('resize', checkDensity)
    return () => window.removeEventListener('resize', checkDensity)
  }, [])

  const handleRealmReload = () => {
    const hue = document.documentElement.classList.contains('dark') ? 'purple' : 'gold'
    triggerDashboardRealmEntrance(hue)
    window.location.assign(`/dashboard?realm=${Date.now()}`)
  }

  const silverFiltered = silverNavigation.filter((item) => {
    if (item.href === '/dashboard/divine-manager') return caps.canUseDivineManagerNav
    if (item.href === '/dashboard/messages') return caps.canUseMessaging
    if (item.href === '/dashboard/social') return caps.canUseSocialAutomation
    return true
  })
  const aiStudioFiltered = caps.canUseAiStudioNav ? aiStudioNavigation : []
  const circeFiltered = circeNavigation.filter((item) => {
    if (item.href === '/dashboard/retention/churn') return caps.canUseRetentionNav
    return true
  })
  const venusFiltered = venusNavigation.filter((item) => {
    if (item.href === '/dashboard/commenter') return caps.canUseCommenterNav
    return true
  })

  return (
    <aside
      className={cn(
        'relative flex h-full min-h-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <button
          type="button"
          onClick={handleRealmReload}
          className="flex min-h-0 w-full items-center gap-2 rounded-md py-0.5 text-left transition-colors hover:bg-sidebar-accent/40"
          aria-label="Reload dashboard with realm entrance"
          title="Reload dashboard with realm entrance"
        >
          <ThemedLogo
            width={28}
            height={28}
            className="flex-shrink-0 rounded-full"
            priority
          />
          {!collapsed && (
            <span className="font-serif text-[0.8rem] font-semibold leading-tight tracking-wider text-primary dark:text-circe-light">
              CIRCE ET VENUS
            </span>
          )}
        </button>
      </div>

      {/* Main Navigation — min-h-0 so flex-1 can shrink and scroll on short viewports */}
      <TooltipProvider delayDuration={0}>
        <nav className="sidebar-nav-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-2 py-1.5">
        {/* Dashboard, Content, Messages - Black light/White dark — compact, same size as rest */}
        <div className="space-y-0.5">
          {silverFiltered.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              variant="default"
              pathname={pathname}
              collapsed={collapsed}
              compactDensity={compactDensity}
            />
          ))}
        </div>

        {/* AI Studio — gold + purple glow; rainbow on hover */}
        <div className="space-y-0.5">
          {aiStudioFiltered.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              variant="ai-studio"
              pathname={pathname}
              collapsed={collapsed}
              compactDensity={compactDensity}
            />
          ))}
        </div>

        {/* Circe's Domain */}
        <div className="space-y-0.5">
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5">
              <Moon
                className={cn(
                  compactDensity ? SIDEBAR_SIZE.compact.iconBox : SIDEBAR_SIZE.cozy.iconBox,
                  'text-circe-light',
                )}
              />
              <span
                className={cn(
                  compactDensity ? SIDEBAR_SIZE.compact.sectionLabel : SIDEBAR_SIZE.cozy.sectionLabel,
                  'font-medium uppercase leading-none tracking-wide text-circe-light/70',
                )}
              >
                Circe
              </span>
            </div>
          )}
          {circeFiltered.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              variant="circe"
              pathname={pathname}
              collapsed={collapsed}
              compactDensity={compactDensity}
            />
          ))}
        </div>

        {/* Venus's Domain */}
        <div className="space-y-0.5">
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5">
              <Sun
                className={cn(
                  compactDensity ? SIDEBAR_SIZE.compact.iconBox : SIDEBAR_SIZE.cozy.iconBox,
                  'text-gold',
                )}
              />
              <span
                className={cn(
                  compactDensity ? SIDEBAR_SIZE.compact.sectionLabel : SIDEBAR_SIZE.cozy.sectionLabel,
                  'font-medium uppercase leading-none tracking-wide text-gold/70',
                )}
              >
                Venus
              </span>
            </div>
          )}
          {venusFiltered.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              variant="venus"
              pathname={pathname}
              collapsed={collapsed}
              compactDensity={compactDensity}
            />
          ))}
        </div>
        </nav>

        {/* Bottom Navigation — shrink-0 keeps Community / Guide / Settings + profile above the fold via nav scroll */}
        <div className="shrink-0 space-y-0.5 border-t border-sidebar-border px-2 py-1.5">
        {bottomNavigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            variant="default"
            pathname={pathname}
            collapsed={collapsed}
            compactDensity={compactDensity}
          />
        ))}

        {/* Hide low-priority identity block on tight viewports so nav never crops. */}
        {!collapsed && profile && !compactDensity && (
          <div className="mt-1.5 rounded-md bg-sidebar-accent/30 p-2">
            <p
              className={cn(
                'truncate font-medium leading-tight text-amber-600 dark:text-circe-light',
                SIDEBAR_SIZE.cozy.linkText,
              )}
            >
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-[0.8rem] leading-tight text-amber-600/70 dark:text-circe-light/70">
              {profile.email}
            </p>
          </div>
        )}
        </div>
      </TooltipProvider>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-14 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar"
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
