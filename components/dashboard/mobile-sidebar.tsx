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
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { SheetClose } from '@/components/ui/sheet'

interface MobileSidebarProps {
  user: User
  profile: Profile | null
}

const circeNavigation = [
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Retention', href: '/dashboard/retention/churn', icon: Activity },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
]

const venusNavigation = [
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Housekeeping', href: '/dashboard/commenter', icon: MessagesSquare },
  { name: 'Mentions', href: '/dashboard/mentions', icon: TrendingUp },
]

const silverNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Divine Manager', href: '/dashboard/divine-manager', icon: Crown },
  { name: 'Content', href: '/dashboard/content', icon: Calendar },
  { name: 'Well-being', href: '/dashboard/well-being', icon: HeartPulse },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Social', href: '/dashboard/social', icon: Share2 },
  { name: 'Content library', href: '/dashboard/content-library', icon: Library },
]

const aiStudioNavigation = [
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation = [
  { name: 'Community', href: '/dashboard/community', icon: Lightbulb },
  { name: 'Guide', href: '/dashboard/guide', icon: BookOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileSidebar({ profile }: MobileSidebarProps) {
  const pathname = usePathname()

  const NavLink = ({ item, variant = 'default' }: { item: typeof silverNavigation[0], variant?: 'default' | 'circe' | 'venus' | 'ai-studio' }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
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
            'flex min-h-[40px] items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium leading-snug transition-colors',
            isActive ? styles.active : styles.inactive
          )}
        >
          <item.icon className={cn(
            'h-4 w-4 flex-shrink-0', 
            isActive && styles.icon,
            isAiStudio && 'animate-hue-rotate'
          )} />
          <span
            className={cn(
              isAiStudio &&
                'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent',
              isAiStudio && !isActive && 'opacity-90',
            )}
          >
            {item.name}
          </span>
        </Link>
      </SheetClose>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Logo */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <ThemedLogo 
          width={32} 
          height={32} 
          className="flex-shrink-0 rounded-full"
          priority
        />
        <span className="font-serif text-[11px] font-semibold leading-tight tracking-wider text-primary dark:text-circe-light">
          CIRCE ET VENUS
        </span>
      </div>

      {/* Navigation — tighter grouping; Circe/Venus in two columns to shorten scroll */}
      <nav className="flex-1 space-y-3 overflow-y-auto p-3">
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
          <div className="flex items-center gap-1.5 px-2 py-0.5">
            <Moon className="h-3.5 w-3.5 text-circe-light" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-circe-light/70">
              Circe
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {circeNavigation.map((item) => (
              <NavLink key={item.name} item={item} variant="circe" />
            ))}
          </div>
        </div>

        {/* Venus's Domain - Gold */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5">
            <Sun className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600/70 dark:text-amber-500/70">
              Venus
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {venusNavigation.map((item) => (
              <NavLink key={item.name} item={item} variant="venus" />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="shrink-0 space-y-0.5 border-t border-border p-2">
        {bottomNavigation.map((item) => (
          <NavLink key={item.name} item={item} variant="default" />
        ))}

        {profile && (
          <div className="mt-1 rounded-md bg-muted/50 p-2">
            <p className="truncate text-xs font-medium text-amber-600 dark:text-circe-light">
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-[10px] text-amber-600/70 dark:text-circe-light/70">
              {profile.email}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
