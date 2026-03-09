'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, Search, LogOut, User, Settings, Menu, Eye, EyeOff } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useRevenuePrivacy } from '@/lib/revenue-privacy-context'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface HeaderProps {
  user: SupabaseUser
  profile: Profile | null
  onMenuClick?: () => void
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/fans': 'Fan Management',
  '/dashboard/content': 'Content Calendar',
  '/dashboard/messages': 'Messages',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/protection': 'Leak Protection',
  '/dashboard/mentions': 'Reputation Monitor',
  '/dashboard/settings': 'Settings',
}

export function DashboardHeader({ user, profile, onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { hideRevenue, toggleRevenueVisibility } = useRevenuePrivacy()

  const getPageName = () => {
    for (const [path, name] of Object.entries(pageNames)) {
      if (pathname === path || pathname.startsWith(path + '/')) {
        return name
      }
    }
    return 'Dashboard'
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase() || 'U'

  return (
    <header className="glass-panel animate-glass-shimmer flex h-16 items-center justify-between px-4 sm:px-6 transition-brand">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10 shrink-0 tap-target md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 md:mr-2">
          <Image src="/logo.png" alt="Circe and Venus" width={28} height={28} className="h-7 w-7 rounded-lg object-contain" />
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold truncate">{getPageName()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fans, content..."
            className="w-64 bg-input pl-9"
          />
        </div>

        {/* Revenue privacy (hide amounts like crypto wallet) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRevenueVisibility}
          className="h-10 w-10 tap-target"
          aria-label={hideRevenue ? 'Show revenue' : 'Hide revenue'}
          title={hideRevenue ? 'Show revenue amounts' : 'Hide revenue amounts'}
        >
          {hideRevenue ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
        </Button>

        {/* Theme (day/night) */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-10 w-10 tap-target">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full tap-target">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile?.full_name || 'Creator'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/dashboard/settings" className="flex cursor-pointer items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/dashboard/settings" className="flex cursor-pointer items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
