'use client'

import { useEffect, useState } from 'react'
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
import { triggerDashboardRealmEntrance } from '@/components/dashboard/dashboard-realm-entrance'
import { useDashboardPulseOptional } from '@/components/dashboard/dashboard-pulse-provider'
import { wellbeingNavTextPulseClass, type PulseSeverity } from '@/lib/wellbeing/pulse-engine'

interface MobileSidebarProps {
  user: User
  profile: Profile | null
}

interface NavItem {
  name: string
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
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
  { name: 'Retention', href: '/dashboard/retention/churn', icon: Activity },
]

const venusNavigation: NavItem[] = [
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Mentions', href: '/dashboard/mentions', icon: TrendingUp },
  { name: 'Fan Atlas', href: '/dashboard/commenter', icon: MessagesSquare },
]

/** Match desktop sidebar: ~9% larger than text-sm; icons scale with row */
const mobileNavText = 'text-[0.95rem] leading-snug'
const mobileNavIcon = 'h-[1.125rem] w-[1.125rem]'

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
    name: 'Guide & suggestions',
    href: '/dashboard/guide',
    icon: BookOpen,
    activeMatch: ['/dashboard/guide', '/dashboard/community'],
  },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileSidebar({ user, profile }: MobileSidebarProps) {
  const pathname = usePathname()
  const pulseOptional = useDashboardPulseOptional()
  const pulseNavSeverity = pulseOptional?.pulse?.severity
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

  const NavLink = ({
    item,
    variant = 'default',
    pulseNavSeverity: pulseSev,
  }: {
    item: NavItem
    variant?: 'default' | 'circe' | 'venus' | 'ai-studio'
    pulseNavSeverity?: PulseSeverity
  }) => {
    const isActive = navItemIsActive(pathname, item)
    const isAiStudio = variant === 'ai-studio'
    const isDivineManager = item.href === '/dashboard/divine-manager'

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
        inactive: 'text-foreground/68 hover:bg-muted/38 hover:text-foreground',
        icon: 'text-primary/50 group-hover:text-primary/85 dark:text-amber-200/45 dark:group-hover:text-amber-200/88',
      },
    }
    
    const styles = variantStyles[variant]
    
    const linkClassName = cn(
      compactMobile
        ? 'flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 font-medium transition-colors duration-150 ease-out'
        : 'flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors duration-150 ease-out',
      navTextClass,
      isActive ? styles.active : styles.inactive,
      isAiStudio && 'w-full min-w-0 bg-card rounded-[calc(0.75rem-2px)]',
    )

    const linkEl = (
      <Link href={item.href} data-tour={item.href} className={linkClassName}>
        {isAiStudio ? (
          <Star
            aria-hidden
            className={cn(navIconClass, 'flex-shrink-0 ai-studio-sidebar-star')}
          />
        ) : isDivineManager ? (
          <Crown
            aria-hidden
            className={cn(navIconClass, 'flex-shrink-0 sidebar-divine-manager-crown')}
          />
        ) : (
          <item.icon
            className={cn(
              navIconClass,
              'flex-shrink-0 transition-colors duration-150 ease-out',
              wellbeingPulseClass
                ? cn(wellbeingPulseClass, isActive && 'opacity-100')
                : isActive
                  ? 'text-foreground'
                  : styles.icon,
            )}
          />
        )}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              isAiStudio && 'sidebar-ai-studio-text font-medium tracking-tight',
              isDivineManager && 'sidebar-divine-manager-text font-semibold tracking-tight',
              wellbeingTextPulseClass,
              (wellbeingTextPulseClass || isDivineManager) && 'transition-colors duration-150 ease-out',
            )}
          >
            {item.name}
          </span>
        </div>
      </Link>
    )

    return isAiStudio ? (
      <span className="sidebar-ai-studio-glow-wrap block w-full min-w-0">
        <SheetClose asChild>{linkEl}</SheetClose>
      </span>
    ) : (
      <SheetClose asChild>{linkEl}</SheetClose>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
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
              key={item.name}
              item={item}
              variant="default"
              pulseNavSeverity={item.href === '/dashboard/well-being' ? pulseNavSeverity : undefined}
            />
          ))}
        </div>

        <div className="space-y-1">
          {aiStudioNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="ai-studio" />
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
              Circe
            </span>
          </div>
          {circeNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="circe" />
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
              Venus
            </span>
          </div>
          {venusNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="venus" />
          ))}
        </div>
      </nav>

      <div
        className={cn(
          'border-t border-border/50 bg-gradient-to-b from-transparent to-muted/30',
          compactMobile ? 'px-3 pb-3 pt-4' : 'px-4 pb-4 pt-5',
        )}
      >
        <div className="space-y-1.5">
          {bottomNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="default" />
          ))}
        </div>

        {profile && !compactMobile && (
          <div className="mt-4 border-t border-border/40 pt-4">
            <div className="rounded-xl border border-border/50 bg-muted/35 p-3">
              <p className={cn('truncate font-medium text-foreground', mobileNavText)}>
                {profile.full_name || 'Divine Creator'}
              </p>
              <p className="truncate text-[0.8rem] leading-tight text-foreground/52">{profile.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
