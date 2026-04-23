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
  Moon,
  Sun,
  Star,
  Crown,
  Share2,
  Library,
  Lightbulb,
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

interface MobileSidebarProps {
  user: User
  profile: Profile | null
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  beta?: boolean
}

const circeNavigation: NavItem[] = [
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
  { name: 'Retention', href: '/dashboard/retention/churn', icon: Activity },
]

const venusNavigation: NavItem[] = [
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Mentions', href: '/dashboard/mentions', icon: TrendingUp },
  { name: 'Housekeeping', href: '/dashboard/commenter', icon: MessagesSquare },
]

/** Match desktop sidebar: ~9% larger than text-sm; icons scale with row */
const mobileNavText = 'text-[0.95rem] leading-snug'
const mobileNavIcon = 'h-[1.125rem] w-[1.125rem]'

const silverNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Divine Manager', href: '/dashboard/divine-manager', icon: Crown },
  { name: 'Content Calendar', href: '/dashboard/content', icon: Calendar },
  { name: 'Well-being', href: '/dashboard/well-being', icon: HeartPulse },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Social', href: '/dashboard/social', icon: Share2 },
  { name: 'Content library', href: '/dashboard/content-library', icon: Library },
]

const aiStudioNavigation: NavItem[] = [
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation: NavItem[] = [
  { name: 'Community', href: '/dashboard/community', icon: Lightbulb, beta: true },
  { name: 'Guide', href: '/dashboard/guide', icon: BookOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileSidebar({ profile }: MobileSidebarProps) {
  const pathname = usePathname()
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

  const NavLink = ({ item, variant = 'default' }: { item: NavItem, variant?: 'default' | 'circe' | 'venus' | 'ai-studio' }) => {
    const isActive =
      item.href === '/dashboard/fans'
        ? pathname === '/dashboard/fans'
        : pathname === item.href || pathname.startsWith(item.href + '/')
    const isAiStudio = variant === 'ai-studio'
    
    const variantStyles = {
      default: {
        // Black in light mode, white/silver in dark mode
        active: 'bg-foreground/10 text-foreground',
        inactive: 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
        icon: 'text-foreground'
      },
      circe: {
        active: 'bg-circe/20 text-circe-light',
        inactive: 'text-foreground/70 hover:bg-circe/10 hover:text-circe-light',
        icon: 'text-circe-light'
      },
      venus: {
        // Gold on hover only (idle neutral like default; active = amber)
        active: 'bg-amber-500/20 text-amber-500 dark:text-amber-400',
        inactive:
          'text-foreground/70 hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-400',
        icon: 'text-amber-500 dark:text-amber-400'
      },
      'ai-studio': {
        // Rainbow/multicolor — gradient always on; stronger when active / hover
        active: 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 animate-gradient-x',
        inactive:
          'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 hover:from-pink-500/15 hover:via-purple-500/15 hover:to-cyan-500/15',
        icon: 'text-purple-500'
      }
    }
    
    const styles = variantStyles[variant]
    
    return (
      <SheetClose asChild>
        <Link
          href={item.href}
          data-tour={item.href}
          className={cn(
            compactMobile
              ? 'flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 font-medium transition-colors'
              : 'flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2.5 font-medium transition-colors',
            navTextClass,
            isActive ? styles.active : styles.inactive
          )}
        >
          <item.icon className={cn(
            navIconClass,
            'flex-shrink-0',
            isActive && styles.icon,
            isAiStudio && 'animate-hue-rotate'
          )} />
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                isAiStudio &&
                  'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent',
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
        </Link>
      </SheetClose>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <button
          type="button"
          onClick={handleRealmReload}
          className="flex w-full items-center gap-3 rounded-md py-1 text-left transition-colors hover:bg-muted/40"
          aria-label="Reload dashboard with realm entrance"
          title="Reload dashboard with realm entrance"
        >
          <ThemedLogo
            width={36}
            height={36}
            className="flex-shrink-0 rounded-full"
            priority
          />
          <span className="font-serif text-[0.8rem] font-semibold leading-tight tracking-wider text-primary dark:text-circe-light">
            CIRCE ET VENUS
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn('sidebar-nav-scroll flex-1 overflow-y-auto', compactMobile ? 'space-y-2 p-3' : 'space-y-3 p-4')}>
        {/* Dashboard, Content, Messages - Black light/White dark */}
        <div className="space-y-0.5">
          {silverNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="default" />
          ))}
        </div>

        {/* AI Studio - Rainbow/Multicolor */}
        <div className="space-y-0.5">
          {aiStudioNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="ai-studio" />
          ))}
        </div>

        {/* Circe's Domain */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 px-3 py-1">
            <Moon className={cn(navIconClass, 'text-circe-light')} />
            <span className="text-[0.7rem] font-medium uppercase leading-none tracking-wide text-circe-light/70">
              Circe
            </span>
          </div>
          {circeNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="circe" />
          ))}
        </div>

        {/* Venus's Domain - Gold */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 px-3 py-1">
            <Sun className={cn(navIconClass, 'text-amber-500 dark:text-amber-400')} />
            <span className="text-[0.7rem] font-medium uppercase leading-none tracking-wide text-amber-600/70 dark:text-amber-500/70">
              Venus
            </span>
          </div>
          {venusNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="venus" />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className={cn('space-y-0.5 border-t border-border', compactMobile ? 'p-3' : 'p-4')}>
        {bottomNavigation.map((item) => (
          <NavLink key={item.name} item={item} variant="default" />
        ))}

        {profile && !compactMobile && (
          <div className="mt-2 rounded-lg bg-muted/50 p-2.5">
            <p className={`truncate font-medium text-amber-600 dark:text-circe-light ${mobileNavText}`}>
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-[0.8rem] leading-tight text-amber-600/70 dark:text-circe-light/70">
              {profile.email}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
