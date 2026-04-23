'use client'

import { useState, useEffect } from 'react'
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
import Link from 'next/link'
import { Search, LogOut, User, Settings, Menu, HeartPulse, Sparkles, Wand2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { ThemeToggle } from '@/components/theme-toggle'
import { Notifications } from '@/components/notifications'
import { StartTourButton } from '@/components/tour/start-tour-button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar'
import { DashboardRefreshButton } from '@/components/dashboard/dashboard-refresh-button'
import { getDashboardPageAriaLabel } from '@/lib/dashboard-page-meta'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user: SupabaseUser
  profile: Profile | null
}

export function DashboardHeader({ user, profile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const onWellBeingPage =
    pathname === '/dashboard/well-being' || pathname.startsWith('/dashboard/well-being/')

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-4 sm:h-16 sm:gap-3 sm:px-6">
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        {/* Mobile menu button */}
        {mounted ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] md:hidden"
                data-tour="header-start-tour-mobile"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <MobileSidebar user={user} profile={profile} />
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}

        {/* User menu (top-left, after mobile nav) */}
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
                data-tour="header-user-menu"
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                  <AvatarFallback className="bg-primary dark:bg-circe text-primary-foreground dark:text-circe-foreground text-xs sm:text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" sideOffset={6} forceMount>
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
        ) : (
          <Button
            variant="ghost"
            className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
          >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              <AvatarFallback className="bg-primary dark:bg-circe text-primary-foreground dark:text-circe-foreground text-xs sm:text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}

        <span className="sr-only">{getDashboardPageAriaLabel(pathname)}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 gap-2 rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/18 via-amber-500/12 to-primary/8 p-0 text-xs font-semibold shadow-sm transition hover:border-primary/55 hover:from-primary/24 hover:via-amber-500/18 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/45 sm:h-9 sm:w-auto sm:px-3 sm:text-sm"
          asChild
          title="AI Studio — tools library"
        >
          <Link
            href="/dashboard/ai-studio/tools"
            className="flex items-center justify-center gap-2"
            aria-label="Open AI Studio tools"
          >
            <Wand2 className="h-4 w-4 shrink-0 text-primary sm:hidden" aria-hidden />
            <Sparkles className="hidden h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 sm:block" aria-hidden />
            <span className="hidden sm:inline">Tools</span>
          </Link>
        </Button>
      </div>

      <div className="min-w-0 flex-1" aria-hidden />

      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fans, content..."
            className="w-48 bg-input pl-9 xl:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = searchQuery.trim()
                if (!q) return
                // For now, global search lands on Messages with the query,
                // where the conversation list will pre-filter by ?search=
                router.push(`/dashboard/messages?search=${encodeURIComponent(q)}`)
              }
            }}
          />
        </div>

        {/* Page tutorial */}
        <StartTourButton className="hidden sm:flex" />

        {/* Theme Toggle */}
        <ThemeToggle />

        <DashboardRefreshButton />

        <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0" asChild>
          <Link
            href="/dashboard/well-being"
            title="Well-being"
            aria-label="Well-being"
            className={cn(
              'grid size-full place-items-center rounded-full border border-border bg-secondary/45 p-0 leading-none text-primary transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              onWellBeingPage && 'ring-2 ring-primary/45 ring-offset-2 ring-offset-card',
            )}
          >
            <HeartPulse className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
        </Button>

        {/* Notifications */}
        <Notifications />
      </div>
    </header>
  )
}
