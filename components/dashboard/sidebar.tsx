'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarBrandLockup } from '@/components/dashboard/sidebar-brand-lockup'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
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
  Layers,
  HeartPulse,
  MessagesSquare,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { triggerDashboardRealmEntrance } from '@/components/dashboard/dashboard-realm-entrance'
import { useDashboardPulseOptional } from '@/components/dashboard/dashboard-pulse-provider'
import { useWorkspaceCapabilities } from '@/components/dashboard/workspace-capabilities-context'
import { wellbeingNavTextPulseClass, type PulseSeverity } from '@/lib/wellbeing/pulse-engine'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarDivineManagerCrown } from '@/components/dashboard/sidebar-divine-manager-crown'
import {
  bottomTwinInner,
  bottomTwinRimGold,
  bottomTwinRimPurple,
} from '@/components/dashboard/sidebar-bottom-nav-tokens'

interface SidebarProps {
  user: User
  profile: Profile | null
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** If set, item is active when pathname matches any of these (exact or child path). */
  activeMatch?: readonly string[]
}

function navItemIsActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/dashboard/fans') {
    return pathname === '/dashboard/fans'
  }
  if (item.activeMatch?.length) {
    return item.activeMatch.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
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
  { name: 'Fan Atlas', href: '/dashboard/commenter', icon: MessagesSquare },
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
  { name: 'Content', href: '/dashboard/content', icon: Layers },
  { name: 'Well-being', href: '/dashboard/well-being', icon: HeartPulse },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Social', href: '/dashboard/social', icon: Share2 },
]

const aiStudioNavigation: NavItem[] = [
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation: NavItem[] = [
  {
    /** Short slug for footer twin chips; routing unchanged */
    name: 'Guide',
    href: '/dashboard/guide',
    icon: BookOpen,
    activeMatch: ['/dashboard/guide', '/dashboard/community'],
  },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

/** Motion: short, precise; no decorative easing. */
const navEase = 'duration-150 ease-out'

/** One surface language: neutral pills; section identity reads through icon tint only. */
const variantStyles = {
  default: {
    active: 'bg-sidebar-accent/55 text-sidebar-foreground',
    inactive:
      'text-sidebar-foreground/68 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground active:bg-sidebar-accent/40',
    icon: 'text-sidebar-foreground/48 group-hover:text-sidebar-foreground/78',
  },
  circe: {
    active: 'bg-sidebar-accent/55 text-sidebar-foreground',
    inactive:
      'text-sidebar-foreground/68 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground active:bg-sidebar-accent/40',
    icon: 'text-circe-light/42 group-hover:text-circe-light/72',
  },
  venus: {
    active: 'bg-sidebar-accent/55 text-sidebar-foreground',
    inactive:
      'text-sidebar-foreground/68 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground active:bg-sidebar-accent/40',
    icon: 'text-gold/45 group-hover:text-gold/78',
  },
  'ai-studio': {
    active: 'bg-sidebar-accent/55 text-sidebar-foreground',
    /* Row stays flat on hover — accent only on the star slot (see globals `.ai-studio-nav-*`). */
    inactive:
      'text-sidebar-foreground/68 hover:bg-transparent active:bg-transparent hover:text-sidebar-foreground',
    icon: 'text-primary/50 group-hover:text-primary/85 dark:text-amber-200/45 dark:group-hover:text-amber-200/88',
  },
} as const

type NavVariant = keyof typeof variantStyles

/** Vertical rhythm: short viewports tighten gaps/padding so the rail rarely scrolls. */
type SidebarVerticalDensity = 'normal' | 'tight' | 'cramped'

/** Guide (violet rim) · Settings (amber rim) — one accent per pill. */
function SidebarBottomTwinNav({
  pathname,
  collapsed,
  compactDensity,
  verticalDensity,
}: {
  pathname: string
  collapsed: boolean
  compactDensity: boolean
  verticalDensity: SidebarVerticalDensity
}) {
  const guide = bottomNavigation[0]
  const settings = bottomNavigation[1]
  const guideActive = navItemIsActive(pathname, guide)
  const settingsActive = navItemIsActive(pathname, settings)

  const gapClass = collapsed
    ? verticalDensity === 'cramped'
      ? 'gap-0.5'
      : 'gap-1'
    : verticalDensity === 'cramped'
      ? 'gap-1.5'
      : 'gap-2'

  const linkText = cn(
    'font-semibold tracking-tight',
    compactDensity ? SIDEBAR_SIZE.compact.linkText : SIDEBAR_SIZE.cozy.linkText,
  )
  const iconSz = compactDensity ? SIDEBAR_SIZE.compact.iconBox : SIDEBAR_SIZE.cozy.iconBox

  const TwinChip = ({
    item,
    active,
    rimClass,
    label,
    iconHoverTint,
  }: {
    item: NavItem
    active: boolean
    rimClass: string
    label: string
    iconHoverTint: string
  }) => {
    const Icon = item.icon

    const linkBody = (
      <Link
        href={item.href}
        data-tour={item.href}
        className={cn(
          bottomTwinInner,
          'group relative flex outline-none ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
          collapsed ? 'min-h-[2.375rem] flex-1 justify-center px-0 py-1.5' : 'min-w-0 w-full flex-1 justify-start gap-1 px-2 py-2',
          active
            ? 'bg-sidebar-accent/55 text-sidebar-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
            : [
                'text-sidebar-foreground/76',
                'hover:bg-sidebar-accent/38 hover:text-sidebar-foreground',
                'active:bg-sidebar-accent/44',
              ],
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon
          className={cn(
            'relative z-[1] shrink-0 transition-colors',
            navEase,
            iconSz,
            active ? 'text-sidebar-foreground' : cn('text-sidebar-foreground/52', iconHoverTint),
          )}
          aria-hidden
        />
        {!collapsed && (
          <span className={cn('min-w-0 truncate', linkText, active ? 'text-sidebar-foreground' : 'text-sidebar-foreground/82')}>
            {label}
          </span>
        )}
      </Link>
    )

    const wrapped = <div className={cn('flex min-w-0 flex-1', rimClass)}>{linkBody}</div>

    if (collapsed) {
      return (
        <TooltipPrimitive.Root delayDuration={0}>
          <TooltipPrimitive.Trigger asChild>{wrapped}</TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side="right"
              sideOffset={8}
              className={cn(
                'z-50 max-w-[16rem] origin-(--radix-tooltip-content-transform-origin) rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md',
                'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=right]:slide-in-from-left-2',
              )}
            >
              <span className="font-medium">{label}</span>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      )
    }

    return wrapped
  }

  return (
    <div className={cn(collapsed ? 'flex flex-col' : 'flex w-full', gapClass)}>
      <TwinChip
        item={guide}
        active={guideActive}
        rimClass={bottomTwinRimPurple}
        label="Guide"
        iconHoverTint="group-hover:text-circe-light/82"
      />
      <TwinChip
        item={settings}
        active={settingsActive}
        rimClass={bottomTwinRimGold}
        label="Settings"
        iconHoverTint="group-hover:text-amber-200/85"
      />
    </div>
  )
}

function NavLink({
  item,
  variant = 'default',
  pathname,
  collapsed,
  compactDensity,
  verticalDensity,
  pulseNavSeverity,
}: {
  item: NavItem
  variant?: NavVariant
  pathname: string
  collapsed: boolean
  compactDensity: boolean
  verticalDensity: SidebarVerticalDensity
  pulseNavSeverity?: PulseSeverity
}) {
  const isActive = navItemIsActive(pathname, item)
  const isAiStudio = variant === 'ai-studio'
  const isDivineManager = item.href === '/dashboard/divine-manager'
  const styles = variantStyles[variant]
  const Icon = item.icon

  const linkClassName = cn(
    'group flex items-center font-medium',
    'transition-[background-color,color]',
    navEase,
    compactDensity ? SIDEBAR_SIZE.compact.linkText : SIDEBAR_SIZE.cozy.linkText,
    collapsed
      ? cn(
          'relative justify-center overflow-visible gap-0 rounded-xl px-2',
          verticalDensity === 'cramped' ? 'min-h-8 py-1.5' : verticalDensity === 'tight' ? 'min-h-9 py-1.5' : 'min-h-10 py-2',
        )
      : cn(
          'gap-3 rounded-xl px-2.5',
          verticalDensity === 'cramped'
            ? 'min-h-8 gap-2 py-1.5'
            : verticalDensity === 'tight'
              ? 'min-h-9 py-2'
              : 'min-h-10 py-2.5',
        ),
    isActive ? styles.active : styles.inactive,
  )

  const wellbeingPulseClass =
    item.href === '/dashboard/well-being' && pulseNavSeverity
      ? pulseNavSeverity === 'intervene'
        ? 'sidebar-nav-pulse-intervene'
        : pulseNavSeverity === 'attend'
          ? 'sidebar-nav-pulse-attend'
          : 'sidebar-nav-pulse-steady'
      : null

  const wellbeingTextPulseClass =
    item.href === '/dashboard/well-being'
      ? wellbeingNavTextPulseClass(pulseNavSeverity)
      : null

  const linkInner = (
    <>
      {collapsed && !isAiStudio && !isDivineManager && (
        <span
          className="sidebar-nav-collapsed-glow pointer-events-none absolute inset-0 z-0 rounded-xl"
          aria-hidden
        />
      )}
      {isAiStudio ? (
        <span className="ai-studio-nav-star-slot inline-flex shrink-0 rounded-lg">
          <span className="ai-studio-nav-star-pad inline-flex items-center justify-center rounded-md">
            <Star
              aria-hidden
              className={cn(
                'relative z-[1] flex-shrink-0',
                navEase,
                compactDensity ? SIDEBAR_SIZE.compact.iconBox : SIDEBAR_SIZE.cozy.iconBox,
                'ai-studio-sidebar-star',
              )}
            />
          </span>
        </span>
      ) : isDivineManager ? (
        <SidebarDivineManagerCrown
          navEase={navEase}
          iconBoxClass={compactDensity ? SIDEBAR_SIZE.compact.iconBox : SIDEBAR_SIZE.cozy.iconBox}
        />
      ) : (
        <Icon
          className={cn(
            'relative z-[1] flex-shrink-0 transition-colors',
            navEase,
            compactDensity ? SIDEBAR_SIZE.compact.iconBox : SIDEBAR_SIZE.cozy.iconBox,
            wellbeingPulseClass
              ? cn(wellbeingPulseClass, isActive && 'opacity-100')
              : isActive
                ? 'text-sidebar-foreground'
                : styles.icon,
          )}
        />
      )}
      {!collapsed && (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              isAiStudio && 'sidebar-ai-studio-text font-medium tracking-tight',
              isDivineManager && 'sidebar-divine-manager-text font-semibold tracking-tight',
              wellbeingTextPulseClass,
              (wellbeingTextPulseClass || isDivineManager) && cn(navEase, 'transition-colors'),
            )}
          >
            {item.name}
          </span>
        </div>
      )}
    </>
  )

  const linkEl = (
    <Link
      href={item.href}
      data-tour={item.href}
      className={linkClassName}
      aria-current={isActive ? 'page' : undefined}
    >
      {linkInner}
    </Link>
  )

  if (collapsed) {
    return (
      <TooltipPrimitive.Root delayDuration={0}>
        <TooltipPrimitive.Trigger asChild>{linkEl}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            sideOffset={8}
            className={cn(
              'z-50 max-w-[16rem] origin-(--radix-tooltip-content-transform-origin) rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md',
              'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=right]:slide-in-from-left-2',
            )}
          >
            <span
              className={cn(
                'font-medium',
                isDivineManager && 'sidebar-divine-manager-text',
                wellbeingTextPulseClass,
                (wellbeingTextPulseClass || isDivineManager) && cn(navEase, 'transition-colors'),
              )}
            >
              {item.name}
            </span>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    )
  }

  return linkEl
}

export function DashboardSidebar({ profile }: SidebarProps) {
  const pulseOptional = useDashboardPulseOptional()
  const pulseNavSeverity = pulseOptional?.pulse?.severity
  const caps = useWorkspaceCapabilities()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [compactDensity, setCompactDensity] = useState(false)
  const [verticalDensity, setVerticalDensity] = useState<SidebarVerticalDensity>('normal')
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
      const h = window.innerHeight
      const w = window.innerWidth
      const shortScreen = h < 860
      const narrowScreen = w < 1320
      setCompactDensity(shortScreen || narrowScreen)
      setVerticalDensity(h < 620 ? 'cramped' : h < 760 ? 'tight' : 'normal')
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

  const navGroupGap = cn(
    verticalDensity === 'cramped' && 'gap-3 py-2',
    verticalDensity === 'tight' && 'gap-4 py-3',
    verticalDensity === 'normal' && 'gap-6 py-4',
  )
  const navItemStack = verticalDensity === 'cramped' ? 'space-y-0.5' : 'space-y-1'
  const bottomRailClass = cn(
    'relative shrink-0 border-t border-sidebar-border/45 bg-gradient-to-b from-transparent to-sidebar-accent/10 px-2.5',
    verticalDensity === 'cramped' && 'pb-2 pt-2.5',
    verticalDensity === 'tight' && 'pb-3 pt-3.5',
    verticalDensity === 'normal' && 'pb-4 pt-5',
  )

  return (
    <aside
      className={cn(
        'relative isolate flex h-full min-h-0 flex-1 flex-col overflow-visible border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <SidebarBrandLockup collapsed={collapsed} onRealmClick={handleRealmReload} variant="desktop" />

      {/* flex-1 column: guarantees nav fills space below brand and bottom rail sits on viewport bottom */}
      <TooltipProvider delayDuration={0}>
        <div className="flex min-h-0 flex-1 flex-col">
        <nav
          className={cn(
            'sidebar-nav-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden px-2.5',
            navGroupGap,
            /* Prefer fitting the viewport; scroll only if caps / locale still overflow */
            'overflow-y-auto overscroll-y-contain',
          )}
        >
        {/* Primary destinations */}
        <div className={navItemStack}>
          {silverFiltered.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              variant="default"
              pathname={pathname}
              collapsed={collapsed}
              compactDensity={compactDensity}
              verticalDensity={verticalDensity}
              pulseNavSeverity={item.href === '/dashboard/well-being' ? pulseNavSeverity : undefined}
            />
          ))}
        </div>

        <div className={navItemStack}>
          {aiStudioFiltered.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              variant="ai-studio"
              pathname={pathname}
              collapsed={collapsed}
              compactDensity={compactDensity}
              verticalDensity={verticalDensity}
            />
          ))}
        </div>

        <div className={navItemStack}>
          {!collapsed && (
            <div
              className={cn(
                'flex items-center gap-2 px-1',
                verticalDensity === 'cramped' ? 'mb-0' : 'mb-0.5',
              )}
            >
              <Moon
                className={cn(
                  compactDensity ? 'h-3 w-3' : 'h-3.5 w-3.5',
                  'circe-nav-moon-glow shrink-0 text-circe-light/45 dark:text-circe-light/55',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'font-semibold uppercase leading-none tracking-[0.14em] text-sidebar-foreground/38',
                  compactDensity ? 'text-[0.6rem]' : 'text-[0.625rem]',
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
              verticalDensity={verticalDensity}
            />
          ))}
        </div>

        <div className={navItemStack}>
          {!collapsed && (
            <div
              className={cn(
                'flex items-center gap-2 px-1',
                verticalDensity === 'cramped' ? 'mb-0' : 'mb-0.5',
              )}
            >
              <Sun
                className={cn(
                  compactDensity ? 'h-3 w-3' : 'h-3.5 w-3.5',
                  'venus-nav-sun-glow shrink-0 text-gold/48 dark:text-gold/55',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'font-semibold uppercase leading-none tracking-[0.14em] text-sidebar-foreground/38',
                  compactDensity ? 'text-[0.6rem]' : 'text-[0.625rem]',
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
              verticalDensity={verticalDensity}
            />
          ))}
        </div>
        </nav>

        {/* Bottom rail — secondary destinations; calmer than main nav */}
        <div className={bottomRailClass}>
        <SidebarBottomTwinNav
          pathname={pathname}
          collapsed={collapsed}
          compactDensity={compactDensity}
          verticalDensity={verticalDensity}
        />

        {!collapsed && profile && !compactDensity && (
          <div
            className={cn(
              'border-t border-sidebar-border/35',
              verticalDensity === 'cramped' ? 'mt-2 pt-2' : verticalDensity === 'tight' ? 'mt-3 pt-3' : 'mt-4 pt-4',
            )}
          >
          <div className="rounded-xl border border-sidebar-border/40 bg-sidebar-accent/22 p-3 transition-colors duration-200">
            <p className={cn('truncate font-medium leading-tight text-sidebar-foreground', SIDEBAR_SIZE.cozy.linkText)}>
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-[0.8rem] leading-tight text-sidebar-foreground/52">
              {profile.email}
            </p>
          </div>
          </div>
        )}
        </div>
        </div>
      </TooltipProvider>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-10 z-30 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-sm"
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
