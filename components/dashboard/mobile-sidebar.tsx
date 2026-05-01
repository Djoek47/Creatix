'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AiStudioNavStar } from '@/components/dashboard/ai-studio-nav-star'
import { SidebarBrandLockup } from '@/components/dashboard/sidebar-brand-lockup'
import { cn } from '@/lib/utils'
import {
  DASHBOARD_MESSAGES_NAV_HREF,
  dashboardMessagesNavIconClass,
  dashboardMessagesNavLabelClass,
} from '@/lib/dashboard-nav-messages-accent'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Shield,
  TrendingUp,
  Settings,
  ChevronDown,
  Moon,
  Sun,
  Star,
  Crown,
  Share2,
  Layers,
  BookOpen,
  HeartPulse,
  MessagesSquare,
  Activity,
  LucideIcon,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { SheetClose } from '@/components/ui/sheet'
import { SidebarDivineManagerCrown } from '@/components/dashboard/sidebar-divine-manager-crown'
import { MessagesNavUnreadSweep } from '@/components/dashboard/messages-nav-unread-sweep'
import { useMessagesNavUnreadTotal } from '@/hooks/use-messages-nav-unread-total'
import { useWorkspaceCapabilities } from '@/components/dashboard/workspace-capabilities-context'
import { triggerDashboardRealmEntrance } from '@/components/dashboard/dashboard-realm-entrance'
import { useDashboardPulseOptional } from '@/components/dashboard/dashboard-pulse-provider'
import { wellbeingNavTextPulseClass, type PulseSeverity } from '@/lib/wellbeing/pulse-engine'
import {
  bottomTwinChipIconClasses,
  bottomTwinInnerMobile,
  bottomTwinRimGold,
  bottomTwinRimPurple,
} from '@/components/dashboard/sidebar-bottom-nav-tokens'

interface MobileSidebarProps {
  user: User
  profile: Profile | null
}

interface NavItem {
  nameKey: string
  href: string
  icon: LucideIcon
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

const circeNavigation: NavItem[] = [
  { nameKey: 'sidebar.analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { nameKey: 'sidebar.protection', href: '/dashboard/protection', icon: Shield },
  { nameKey: 'sidebar.retention', href: '/dashboard/retention/churn', icon: Activity },
]

const venusNavigation: NavItem[] = [
  { nameKey: 'sidebar.fans', href: '/dashboard/fans', icon: Users },
  { nameKey: 'sidebar.mentions', href: '/dashboard/mentions', icon: TrendingUp },
  { nameKey: 'sidebar.fanAtlas', href: '/dashboard/commenter', icon: MessagesSquare },
]

/** Match desktop sidebar: ~9% larger than text-sm; icons scale with row */
const mobileNavText = 'text-[0.95rem] leading-snug'
const mobileNavIcon = 'h-[1.125rem] w-[1.125rem]'

const silverNavigation: NavItem[] = [
  { nameKey: 'sidebar.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'sidebar.divineManager', href: '/dashboard/divine-manager', icon: Crown },
  { nameKey: 'sidebar.content', href: '/dashboard/content', icon: Layers },
  { nameKey: 'sidebar.wellbeing', href: '/dashboard/well-being', icon: HeartPulse },
  { nameKey: 'sidebar.messages', href: '/dashboard/messages', icon: MessageSquare },
  { nameKey: 'sidebar.social', href: '/dashboard/social', icon: Share2 },
]

const aiStudioNavigation: NavItem[] = [
  { nameKey: 'sidebar.aiStudio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation: NavItem[] = [
  {
    nameKey: 'sidebar.guide',
    href: '/dashboard/guide',
    icon: BookOpen,
    activeMatch: ['/dashboard/guide', '/dashboard/community'],
  },
  { nameKey: 'sidebar.settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileSidebar({ user, profile: _profile }: MobileSidebarProps) {
  const pathname = usePathname()
  const tNav = useTranslations('navigation')
  const pulseOptional = useDashboardPulseOptional()
  const pulseNavSeverity = pulseOptional?.pulse?.severity
  const caps = useWorkspaceCapabilities()
  const messagesNavUnread = useMessagesNavUnreadTotal(caps.canUseMessaging)
  const [compactMobile, setCompactMobile] = useState(false)

  const handleRealmReload = () => {
    const hue = document.documentElement.classList.contains('dark') ? 'purple' : 'gold'
    triggerDashboardRealmEntrance(hue)
    window.location.assign(`/dashboard?realm=${Date.now()}`)
  }

  useEffect(() => {
    const checkCompact = () => {
      setCompactMobile(window.innerHeight < 760 || window.innerWidth < 360)
    }
    checkCompact()
    window.addEventListener('resize', checkCompact)
    return () => window.removeEventListener('resize', checkCompact)
  }, [])

  const navTextClass = compactMobile ? 'text-[0.86rem] leading-snug' : mobileNavText
  const navIconClass = compactMobile ? 'h-4 w-4' : mobileNavIcon

  const footerGuideNav = bottomNavigation[0]
  const footerSettingsNav = bottomNavigation[1]
  const footerGuideActive = navItemIsActive(pathname, footerGuideNav)
  const footerSettingsActive = navItemIsActive(pathname, footerSettingsNav)

  const NavLink = ({
    item,
    variant = 'default',
    pulseNavSeverity: pulseSev,
    messagesUnreadTotal,
  }: {
    item: NavItem
    variant?: 'default' | 'circe' | 'venus' | 'ai-studio'
    pulseNavSeverity?: PulseSeverity
    messagesUnreadTotal?: number
  }) => {
    const isActive = navItemIsActive(pathname, item)
    const isAiStudio = variant === 'ai-studio'
    const isDivineManager = item.href === '/dashboard/divine-manager'
    const isMessagesNav =
      variant === 'default' && item.href === DASHBOARD_MESSAGES_NAV_HREF

    const wellbeingPulseClass =
      item.href === '/dashboard/well-being' && pulseSev
        ? pulseSev === 'intervene'
          ? 'sidebar-nav-pulse-intervene'
          : pulseSev === 'attend'
            ? 'sidebar-nav-pulse-attend'
            : 'sidebar-nav-pulse-steady'
        : null

    const wellbeingTextPulseClass =
      item.href === '/dashboard/well-being' ? wellbeingNavTextPulseClass(pulseSev) : null

    const variantStyles = {
      default: {
        active: 'bg-muted/55 text-foreground',
        inactive: 'text-foreground/68 hover:bg-muted/38 hover:text-foreground',
        icon: 'text-foreground/48 group-hover:text-foreground/78',
      },
      circe: {
        active: 'bg-muted/55 text-foreground',
        inactive: 'text-foreground/68 hover:bg-muted/38 hover:text-foreground',
        icon: 'text-circe-light/42 group-hover:text-circe-light/72',
      },
      venus: {
        active: 'bg-muted/55 text-foreground',
        inactive: 'text-foreground/68 hover:bg-muted/38 hover:text-foreground',
        icon: 'text-gold/45 group-hover:text-gold/78',
      },
      'ai-studio': {
        active: 'bg-muted/55 text-foreground',
        inactive: 'text-foreground/68 hover:bg-transparent active:bg-transparent hover:text-foreground',
        icon: 'text-primary/50 group-hover:text-primary/85 dark:text-amber-200/45 dark:group-hover:text-amber-200/88',
      },
    }
    
    const styles = variantStyles[variant]
    
    const linkClassName = cn(
      'group',
      compactMobile
        ? 'flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 font-medium transition-colors duration-150 ease-out'
        : 'flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors duration-150 ease-out',
      navTextClass,
      isActive ? styles.active : styles.inactive,
      isMessagesNav && (messagesUnreadTotal ?? 0) > 0 && 'relative isolate overflow-visible',
    )

    const linkEl = (
      <Link
        href={item.href}
        data-tour={item.href}
        className={linkClassName}
        aria-current={isActive ? 'page' : undefined}
      >
        {isMessagesNav ? <MessagesNavUnreadSweep unreadTotal={messagesUnreadTotal ?? 0} /> : null}
        {isAiStudio ? (
          <span className="ai-studio-nav-star-slot inline-flex shrink-0 rounded-lg">
            <span className="ai-studio-nav-star-pad inline-flex items-center justify-center rounded-md">
              <AiStudioNavStar gradientSlot="sidebar-mobile" className={cn(navIconClass, 'shrink-0')} />
            </span>
          </span>
        ) : isDivineManager ? (
          <SidebarDivineManagerCrown gradientSlot="sidebar-mobile" iconBoxClass={cn(navIconClass, 'flex-shrink-0')} />
        ) : (
          <item.icon
            className={cn(
              navIconClass,
              'relative z-[1] flex-shrink-0',
              wellbeingPulseClass
                ? cn(wellbeingPulseClass, isActive && 'opacity-100', 'transition-colors duration-150 ease-out')
                : isMessagesNav
                  ? dashboardMessagesNavIconClass(isActive)
                  : cn('transition-colors duration-150 ease-out', isActive ? 'text-foreground' : styles.icon),
            )}
          />
        )}
        <div className={cn('flex min-w-0 items-center gap-2', isMessagesNav && 'relative z-[1]')}>
          <span
            className={cn(
              isAiStudio && 'sidebar-ai-studio-text font-medium tracking-tight',
              isDivineManager && 'sidebar-divine-manager-text font-semibold tracking-tight',
              isMessagesNav && dashboardMessagesNavLabelClass(isActive),
              wellbeingTextPulseClass,
              (wellbeingTextPulseClass || isDivineManager) && 'transition-colors duration-150 ease-out',
            )}
          >
            {tNav(item.nameKey)}
          </span>
        </div>
      </Link>
    )

    return <SheetClose asChild>{linkEl}</SheetClose>
  }

  return (
    <div className="mobile-dashboard-nav flex h-full flex-col bg-card">
      <SidebarBrandLockup onRealmClick={handleRealmReload} variant="mobile" />

      {/* Navigation */}
      <nav
        className={cn(
          'sidebar-nav-scroll flex flex-1 flex-col gap-6 overflow-y-auto',
          compactMobile ? 'p-3' : 'p-4',
        )}
      >
        <div className="space-y-1">
          {silverNavigation.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              variant="default"
              pulseNavSeverity={item.href === '/dashboard/well-being' ? pulseNavSeverity : undefined}
              messagesUnreadTotal={
                item.href === DASHBOARD_MESSAGES_NAV_HREF ? messagesNavUnread : undefined
              }
            />
          ))}
        </div>

        <div className="space-y-1">
          {aiStudioNavigation.map((item) => (
            <NavLink key={item.href} item={item} variant="ai-studio" />
          ))}
        </div>

        <div className="space-y-1">
          <div className="mb-0.5 flex items-center gap-2 px-1">
            <Moon
              className={cn(
                compactMobile ? 'h-3 w-3' : 'h-3.5 w-3.5',
                'circe-nav-moon-glow shrink-0 text-circe-light/45 dark:text-circe-light/55',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'font-semibold uppercase leading-none tracking-[0.14em] text-foreground/38',
                compactMobile ? 'text-[0.6rem]' : 'text-[0.625rem]',
              )}
            >
              {tNav('sidebar.circeSection')}
            </span>
          </div>
          {circeNavigation.map((item) => (
            <NavLink key={item.href} item={item} variant="circe" />
          ))}
        </div>

        <div className="space-y-1">
          <div className="mb-0.5 flex items-center gap-2 px-1">
            <Sun
              className={cn(
                compactMobile ? 'h-3 w-3' : 'h-3.5 w-3.5',
                'venus-nav-sun-glow shrink-0 text-gold/48 dark:text-gold/55',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'font-semibold uppercase leading-none tracking-[0.14em] text-foreground/38',
                compactMobile ? 'text-[0.6rem]' : 'text-[0.625rem]',
              )}
            >
              {tNav('sidebar.venusSection')}
            </span>
          </div>
          {venusNavigation.map((item) => (
            <NavLink key={item.href} item={item} variant="venus" />
          ))}
        </div>
      </nav>

      <div
        className={cn(
          'border-t border-border/50 bg-gradient-to-b from-transparent to-muted/30',
          compactMobile ? 'px-3 pb-3 pt-4' : 'px-4 pb-4 pt-5',
        )}
      >
        <div className="flex gap-2">
          <div className={cn('flex min-w-min flex-[5]', bottomTwinRimPurple)}>
            <SheetClose asChild>
              <Link
                href={footerGuideNav.href}
                data-tour={footerGuideNav.href}
                className={cn(
                  bottomTwinInnerMobile,
                  'justify-start gap-2 px-2.5 text-[0.8125rem] font-semibold outline-none ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  footerGuideActive
                    ? 'bg-muted/52 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                    : 'text-foreground/75 hover:bg-muted/45 hover:text-foreground active:bg-muted/52',
                )}
                aria-current={footerGuideActive ? 'page' : undefined}
              >
                <BookOpen
                  className={bottomTwinChipIconClasses('guide', footerGuideActive, 'sheet')}
                  aria-hidden
                />
                <span className="shrink-0 whitespace-nowrap">{tNav(footerGuideNav.nameKey)}</span>
              </Link>
            </SheetClose>
          </div>
          <div className={cn('flex min-w-min flex-[9]', bottomTwinRimGold)}>
            <SheetClose asChild>
              <Link
                href={footerSettingsNav.href}
                data-tour={footerSettingsNav.href}
                className={cn(
                  bottomTwinInnerMobile,
                  'w-full justify-center gap-2 px-2.5 text-[0.8125rem] font-semibold outline-none ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  footerSettingsActive
                    ? 'bg-muted/52 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                    : 'text-foreground/75 hover:bg-muted/45 hover:text-foreground active:bg-muted/52',
                )}
                aria-current={footerSettingsActive ? 'page' : undefined}
              >
                <Settings
                  className={bottomTwinChipIconClasses('settings', footerSettingsActive, 'sheet')}
                  aria-hidden
                />
                <span className="shrink-0 whitespace-nowrap">{tNav(footerSettingsNav.nameKey)}</span>
              </Link>
            </SheetClose>
          </div>
        </div>

        {!compactMobile && (
          <div className="mt-4 border-t border-border/40 pt-4">
            <div
              className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 dark:bg-muted/20"
              role="note"
              aria-label={`${tNav('sidebar.systemStripTitle')}: ${tNav('sidebar.systemStripStatus')}`}
            >
              <div className="flex items-start gap-2.5">
                <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600/85 dark:text-emerald-400/90" aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                    {tNav('sidebar.systemStripTitle')}
                  </p>
                  <p className={cn('truncate text-[12px] font-medium leading-snug text-foreground/88', mobileNavText)}>
                    {tNav('sidebar.systemStripStatus')}
                  </p>
                  <p className="truncate text-[10px] leading-snug text-foreground/48">{tNav('sidebar.systemStripHint')}</p>
                </div>
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 -rotate-90 text-foreground/22" aria-hidden />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
