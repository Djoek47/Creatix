'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crown, Home, MessageSquare, Sparkles, Shield, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type MobileNavItem = {
  href: string
  labelKey: string
  icon: LucideIcon
  exact?: boolean
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: Home, exact: true },
  { href: '/dashboard/messages', labelKey: 'sidebar.messages', icon: MessageSquare },
  { href: '/dashboard/ai-studio', labelKey: 'sidebar.aiStudio', icon: Sparkles },
  { href: '/dashboard/protection', labelKey: 'sidebar.protection', icon: Shield },
  { href: '/dashboard/divine-manager', labelKey: 'sidebar.divineManager', icon: Crown },
]

function itemActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardMobileBottomNav() {
  const pathname = usePathname() ?? ''
  const tNav = useTranslations('navigation')

  if (
    pathname.startsWith('/dashboard/messages') ||
    pathname.startsWith('/dashboard/ai-studio/tools/') ||
    pathname.startsWith('/dashboard/content/new')
  ) {
    return null
  }

  return (
    <nav
      aria-label="Primary dashboard"
      className={cn(
        'fixed inset-x-0 bottom-0 z-[65] md:hidden',
        'border-t border-border/45 bg-background/86 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_44px_-28px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
        'dark:border-white/[0.09] dark:bg-background/88',
      )}
    >
      <div className="mx-auto grid max-w-[32rem] grid-cols-5 gap-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = itemActive(pathname, item.href, item.exact)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={tNav(item.labelKey)}
              className={cn(
                'group flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 text-[10px] font-semibold leading-none tracking-tight transition-colors',
                active
                  ? 'bg-primary/12 text-foreground ring-1 ring-primary/18'
                  : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground',
                )}
                strokeWidth={1.9}
                aria-hidden
              />
              <span className="max-w-full truncate">{tNav(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
