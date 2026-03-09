'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { User, Bell, Shield, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { icon: User, label: 'Profile', href: '/dashboard/settings/profile' },
  { icon: Bell, label: 'Notifications', href: '/dashboard/settings/notifications' },
  { icon: Shield, label: 'Security', href: '/dashboard/settings/security' },
  { icon: CreditCard, label: 'Billing', href: '/dashboard/settings/billing' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <Card variant="brand" className="h-fit border-0 lg:col-span-1">
      <CardContent className="p-4">
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </CardContent>
    </Card>
  )
}
