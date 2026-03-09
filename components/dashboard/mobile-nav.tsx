'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Shield, Users, MessageSquare, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Protection', href: '/dashboard/protection', icon: Shield },
  { label: 'Fans', href: '/dashboard/fans', icon: Users },
  { label: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-2 py-1"
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-[11px] leading-tight',
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

