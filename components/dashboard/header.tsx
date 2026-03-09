'use client'

import Link from 'next/link'
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
  isMobile?: boolean
}

export function DashboardHeader({ user, profile, onMenuClick, isMobile }: HeaderProps) {
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
          {/* Mobile: fixed top-left so nothing can overlap in portrait (iOS Safari) */}
          {onMenuClick && (
            <>
              <button
                type="button"
                onClick={() => onMenuClick()}
                onTouchStart={(e) => {
                  e.preventDefault()
                  onMenuClick()
                }}
                className="fixed left-0 top-0 z-[60] flex md:hidden h-14 w-14 min-h-[48px] min-w-[48px] items-center justify-center rounded-none hover:bg-accent/50 active:opacity-80 touch-manipulation"
                style={{
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingLeft: 'env(safe-area-inset-left, 0px)',
                }}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="w-14 shrink-0 md:hidden" aria-hidden />
            </>
          )}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
