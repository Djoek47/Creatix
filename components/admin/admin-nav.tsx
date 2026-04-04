'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/simulator', label: 'Daily burn lab' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/errors', label: 'Errors' },
  { href: '/admin/settings', label: 'Settings' },
] as const

export function AdminNav() {
  const pathname = usePathname() ?? '/admin'
  return (
    <header className="border-b border-border bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg font-semibold text-primary">Admin</span>
          <span className="text-xs text-muted-foreground">Usage &amp; operations</span>
        </div>
        <nav className="flex flex-wrap gap-1">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== '/admin' && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
