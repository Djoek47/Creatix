'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import { Search, LogOut, User, Settings, Menu, HeartPulse, Zap } from 'lucide-react'
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
import { HeaderPlatformStatusMenuSection } from '@/components/dashboard/header-platform-status-menu'
import { dashboardHeroTitleKeyFromPath } from '@/lib/dashboard-page-meta'
import { isDashboardCreditSummaryVisible } from '@/lib/dashboard-credit-summary-marker'
import type { CreditWalletSnapshot } from '@/hooks/use-credit-snapshot'
import { cn } from '@/lib/utils'
import { useDashboardPulseOptional } from '@/components/dashboard/dashboard-pulse-provider'
import { RainbowSparklePill } from '@/components/dashboard/rainbow-sparkle-pill'

const userMenuContentClass = cn(
  'w-[min(calc(100vw-2rem),22rem)] max-w-[22rem] sm:w-80',
  'rounded-2xl border border-border/35 bg-popover/90 p-1.5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.4)] backdrop-blur-xl',
  'dark:border-white/[0.08] dark:bg-popover/92 dark:shadow-[0_20px_50px_-18px_rgba(0,0,0,0.55)]',
)

const userMenuItemClass = cn(
  'gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium leading-none tracking-tight',
  'text-foreground/90 outline-none',
  'focus:bg-muted/55 focus:text-foreground data-[highlighted]:bg-muted/55',
)

const userMenuIconWell = cn(
  'flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 dark:bg-muted/25',
  '[&_svg]:text-muted-foreground',
)

const userMenuSeparatorClass = 'mx-2 my-1.5 h-px bg-border/35'

interface HeaderProps {
  user: SupabaseUser
  profile: Profile | null
}

export function DashboardHeader({ user, profile }: HeaderProps) {
  const pathname = usePathname()
  const tDash = useTranslations('dashboard')
  const pulseOptional = useDashboardPulseOptional()
  const pulseSeverity = pulseOptional?.pulse?.severity
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  /** For avatar: extra emphasis when no photo and OnlyFans not linked */
  const [onlyfansLinked, setOnlyfansLinked] = useState<boolean | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [avatarCreditChipAllowed, setAvatarCreditChipAllowed] = useState(false)
  const [avatarChipWallet, setAvatarChipWallet] = useState<CreditWalletSnapshot | null>(null)
  const [avatarChipLoading, setAvatarChipLoading] = useState(false)
  const avatarChipWalletRef = useRef<CreditWalletSnapshot | null>(null)
  const avatarChipFetchInFlightRef = useRef(false)

  const loadAvatarChipWallet = useCallback(async () => {
    if (avatarChipWalletRef.current !== null || avatarChipFetchInFlightRef.current) return
    avatarChipFetchInFlightRef.current = true
    setAvatarChipLoading(true)
    try {
      const res = await fetch('/api/billing/credit-snapshot', { credentials: 'include' })
      if (!res.ok) return
      const data = (await res.json().catch(() => ({}))) as {
        wallet?: {
          totalRemaining?: number
          includedRemaining?: number
          purchasedRemaining?: number
          bankedTrialCredits?: number
        }
      }
      const w = data.wallet
      const snap: CreditWalletSnapshot = {
        totalRemaining: Number(w?.totalRemaining ?? 0),
        includedRemaining: Number(w?.includedRemaining ?? 0),
        purchasedRemaining: Number(w?.purchasedRemaining ?? 0),
        bankedTrialCredits: Math.max(0, Math.floor(Number(w?.bankedTrialCredits ?? 0))),
      }
      avatarChipWalletRef.current = snap
      setAvatarChipWallet(snap)
    } catch {
      // best-effort; chip falls back to label-only on next hover after ref reset if we add it later
    } finally {
      avatarChipFetchInFlightRef.current = false
      setAvatarChipLoading(false)
    }
  }, [])

  const onWellBeingPage =
    pathname === '/dashboard/well-being' || pathname.startsWith('/dashboard/well-being/')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user: u },
      } = await supabase.auth.getUser()
      if (!u || !alive) return
      const { data } = await supabase
        .from('platform_connections')
        .select('platform')
        .eq('user_id', u.id)
        .eq('is_connected', true)
      const hasOf = (data ?? []).some((r: { platform?: string }) => r.platform === 'onlyfans')
      if (alive) setOnlyfansLinked(hasOf)
    })()
    return () => {
      alive = false
    }
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

  const showAvatarImage = Boolean(profile?.avatar_url)
  const avatarFallbackEmphasis = !showAvatarImage && onlyfansLinked === false

  const showAvatarCreditHoverChip =
    avatarHovered &&
    !userMenuOpen &&
    avatarCreditChipAllowed &&
    (avatarChipLoading || avatarChipWallet !== null)

  return (
    <header
      id="dashboard-workspace-header"
      className="dashboard-header-chrome flex h-14 w-full min-w-0 items-center gap-2 px-4 supports-[backdrop-filter]:backdrop-blur-xl sm:h-16 sm:gap-3 sm:px-6"
    >
      {/* AI Studio Tools — solitary lead control (start) */}
      <div className="flex shrink-0 items-center justify-start">
        <RainbowSparklePill
          href="/dashboard/ai-studio/tools"
          label={tDash('header.toolsBadge')}
          title={tDash('header.aiStudioToolsTitle')}
          aria-label={tDash('header.aiStudioToolsAria')}
          className="shadow-none"
        />
      </div>

      {/* Search — centered between Tools and utilities (lg+) */}
      <div className="mx-2 hidden min-w-0 flex-1 justify-center px-2 lg:flex">
        <div className="relative w-full max-w-md xl:max-w-lg">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/55 dark:text-venus/55" />
          <Input
            placeholder={tDash('header.searchPlaceholder')}
            className="h-10 w-full rounded-full border-border/45 bg-muted/25 pl-10 pr-4 text-[13px] shadow-none transition-all duration-300 placeholder:text-muted-foreground/55 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20 dark:focus-visible:border-venus/40 dark:focus-visible:ring-venus/15"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = searchQuery.trim()
                if (!q) return
                router.push(`/dashboard/messages?search=${encodeURIComponent(q)}`)
              }
            }}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
        {mounted ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full transition-colors duration-300 hover:bg-primary/[0.1] dark:hover:bg-venus/[0.1] md:hidden"
                data-tour="header-start-tour-mobile"
              >
                <Menu className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">{tDash('header.openMenu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <MobileSidebar user={user} profile={profile} />
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">{tDash('header.openMenu')}</span>
          </Button>
        )}

        <span className="sr-only">{tDash(dashboardHeroTitleKeyFromPath(pathname))}</span>

        <StartTourButton className="hidden sm:inline-flex" />

        <ThemeToggle />

        <DashboardRefreshButton />

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full p-0 hover:bg-muted/35 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
          asChild
        >
          <Link
            href="/dashboard/well-being"
            title={tDash('header.wellbeingAria')}
            aria-label={tDash('header.wellbeingAria')}
            className={cn(
              'grid size-full place-items-center rounded-full border border-amber-500/35 bg-amber-500/[0.08] p-0 leading-none transition-all duration-300 hover:border-amber-500/55 hover:bg-amber-500/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/35 dark:border-amber-400/30 dark:bg-amber-400/[0.1] dark:hover:border-amber-400/50 dark:hover:bg-amber-400/[0.16] dark:focus-visible:ring-amber-400/35',
              onWellBeingPage &&
                'border-amber-500/60 bg-amber-500/[0.18] ring-1 ring-amber-500/35 dark:border-amber-400/55 dark:bg-amber-400/[0.2] dark:ring-amber-300/35',
            )}
          >
            <HeartPulse
              className={cn(
                'header-wellbeing-heartbeat h-[1.15rem] w-[1.15rem] shrink-0 sm:h-5 sm:w-5',
                pulseSeverity === 'attend' && 'header-wellbeing-pulse-attend',
                pulseSeverity === 'intervene' && 'header-wellbeing-pulse-intervene',
                pulseSeverity === 'steady' && 'header-wellbeing-pulse-steady',
              )}
              aria-hidden
            />
          </Link>
        </Button>

        <Notifications />

        <span
          className="mx-0.5 hidden h-5 w-px shrink-0 bg-gradient-to-b from-transparent via-primary/35 to-transparent dark:via-venus/35 sm:block"
          aria-hidden
        />

        {/* User menu */}
        {mounted ? (
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-muted/35 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
                data-tour="header-user-menu"
                onPointerEnter={() => {
                  setAvatarHovered(true)
                  const allowed = !isDashboardCreditSummaryVisible()
                  setAvatarCreditChipAllowed(allowed)
                  if (allowed) void loadAvatarChipWallet()
                }}
                onPointerLeave={() => setAvatarHovered(false)}
              >
                <span
                  className={cn(
                    'pointer-events-none absolute bottom-0 left-1/2 z-30 flex -translate-x-1/2 translate-y-[calc(100%+8px)] items-center gap-1 whitespace-nowrap rounded-full border border-amber-400/30 bg-popover/95 px-2.5 py-1 text-[11px] font-semibold tabular-nums tracking-tight text-foreground/95 shadow-[0_12px_28px_-10px_rgba(0,0,0,0.65)] ring-1 ring-white/10 backdrop-blur-xl transition-opacity duration-200 ease-out dark:border-amber-300/22 dark:bg-slate-950/94 dark:text-amber-50/95 dark:ring-amber-400/15',
                    showAvatarCreditHoverChip ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                >
                  <Zap className="h-3 w-3 shrink-0 text-amber-500 dark:text-amber-300" />
                  {avatarChipLoading ? (
                    <span className="text-muted-foreground">{tDash('header.creditChipLoading')}</span>
                  ) : avatarChipWallet ? (
                    <span>
                      {avatarChipWallet.totalRemaining.toLocaleString()}{' '}
                      <span className="font-medium text-muted-foreground/90">{tDash('header.credits')}</span>
                    </span>
                  ) : null}
                </span>
                <Avatar
                  className={cn(
                    'relative z-10 h-8 w-8 sm:h-9 sm:w-9',
                    showAvatarImage
                      ? 'ring-2 ring-amber-500/35 shadow-[0_0_22px_-6px_rgba(251,191,36,0.35),0_0_18px_-4px_rgba(168,85,247,0.25)] dark:ring-amber-300/40'
                      : cn(
                          'ring-2 ring-primary/55 shadow-[0_0_24px_-4px] shadow-primary/40 dark:ring-venus/55 dark:shadow-[0_0_26px_-4px_rgba(251,191,36,0.25)]',
                          avatarFallbackEmphasis && 'ring-amber-500 dark:ring-amber-300',
                        ),
                  )}
                >
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || tDash('header.userAvatarAlt')} />
                  <AvatarFallback
                    className={cn(
                      'text-[13px] font-semibold sm:text-sm',
                      showAvatarImage
                        ? 'bg-muted font-medium text-foreground'
                        : cn(
                            'bg-gradient-to-br from-amber-500 via-fuchsia-600 to-violet-700 text-white',
                            'dark:from-amber-400 dark:via-fuchsia-500 dark:to-violet-600',
                            avatarFallbackEmphasis && 'ring-2 ring-inset ring-white/25',
                          ),
                    )}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={userMenuContentClass}
              align="end"
              sideOffset={8}
              forceMount
            >
              <DropdownMenuLabel className="px-3.5 pb-2 pt-2.5 font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">
                    {profile?.full_name || tDash('header.creatorFallback')}
                  </p>
                  <p className="truncate text-[12px] leading-snug text-muted-foreground/85">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className={userMenuSeparatorClass} />
              {userMenuOpen ? (
                <>
                  <HeaderPlatformStatusMenuSection />
                  <DropdownMenuSeparator className={userMenuSeparatorClass} />
                </>
              ) : null}
              <DropdownMenuItem asChild className={userMenuItemClass}>
                <Link href="/dashboard/settings" className="flex w-full cursor-pointer items-center">
                  <span className={userMenuIconWell}>
                    <User className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  {tDash('header.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={userMenuItemClass}>
                <Link href="/dashboard/settings" className="flex w-full cursor-pointer items-center">
                  <span className={userMenuIconWell}>
                    <Settings className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  {tDash('header.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={userMenuSeparatorClass} />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleSignOut}
                className={cn(
                  'gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium leading-none tracking-tight outline-none',
                  'focus:bg-destructive/10 data-[highlighted]:bg-destructive/10',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 dark:bg-destructive/15 [&_svg]:text-destructive">
                  <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                {tDash('header.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
          >
            <Avatar
              className={cn(
                'h-8 w-8 sm:h-9 sm:w-9',
                showAvatarImage
                  ? 'ring-2 ring-amber-500/35 shadow-[0_0_22px_-6px_rgba(251,191,36,0.35),0_0_18px_-4px_rgba(168,85,247,0.25)] dark:ring-amber-300/40'
                  : cn(
                      'ring-2 ring-primary/55 shadow-[0_0_24px_-4px] shadow-primary/40 dark:ring-venus/55 dark:shadow-[0_0_26px_-4px_rgba(251,191,36,0.25)]',
                      avatarFallbackEmphasis && 'ring-amber-500 dark:ring-amber-300',
                    ),
              )}
            >
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || tDash('header.userAvatarAlt')} />
              <AvatarFallback
                className={cn(
                  'text-[13px] font-semibold sm:text-sm',
                  showAvatarImage
                    ? 'bg-muted font-medium text-foreground'
                    : cn(
                        'bg-gradient-to-br from-amber-500 via-fuchsia-600 to-violet-700 text-white',
                        'dark:from-amber-400 dark:via-fuchsia-500 dark:to-violet-600',
                        avatarFallbackEmphasis && 'ring-2 ring-inset ring-white/25',
                      ),
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}
      </div>
    </header>
  )
}
