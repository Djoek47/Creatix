'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, User, Settings, Menu, Eye, EyeOff, Shield, Users } from 'lucide-react'
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

export function DashboardHeader({ user, profile, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { hideRevenue, toggleRevenueVisibility } = useRevenuePrivacy()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="brand-header sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="Circe and Venus">
            {onMenuClick && (
              <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10 tap-target md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-lg object-contain" />
            <h1 className="font-title text-xl font-bold brand-gradient-text hidden sm:block">
              Circe and Venus
            </h1>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="icon" asChild className="tap-target">
              <Link href="/dashboard/protection" aria-label="Protection">
                <Shield className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="tap-target">
              <Link href="/dashboard/fans" aria-label="Fans">
                <Users className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="relative tap-target" asChild>
              <Link href="/dashboard/notifications" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleRevenueVisibility} className="tap-target" aria-label={hideRevenue ? 'Show revenue' : 'Hide revenue'}>
              {hideRevenue ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="tap-target">
                  <User className="w-5 h-5" />
                  <span className="sr-only">Profile</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name || 'Creator'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex cursor-pointer items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
