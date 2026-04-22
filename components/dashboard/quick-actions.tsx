'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Upload, MessageSquare, BarChart3, HeartPulse, WalletCards } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const actions = [
    {
      icon: Upload,
      label: 'Upload Content',
      description: 'Add new photos or videos',
      href: '/dashboard/content/new',
      color: 'bg-chart-1/10 text-chart-1',
    },
    {
      icon: Plus,
      label: 'Add Fan',
      description: 'Manually add a fan profile',
      href: '/dashboard/fans/new',
      color: 'bg-chart-2/10 text-chart-2',
    },
    {
      icon: MessageSquare,
      label: 'Mass Message',
      description: 'Send to multiple fans',
      href: '/dashboard/messages/mass',
      color: 'bg-chart-3/10 text-chart-3',
    },
    {
      icon: BarChart3,
      label: 'View Reports',
      description: 'Detailed analytics',
      href: '/dashboard/analytics',
      color: 'bg-chart-4/10 text-chart-4',
    },
    {
      icon: HeartPulse,
      label: 'Well-being',
      description: 'Pressure, mimic profile & cosmic rhythm',
      href: '/dashboard/well-being',
      color: 'bg-circe/15 text-circe dark:text-circe-light',
    },
    {
      icon: WalletCards,
      label: 'Credits Planner',
      description: 'Allocation strategy for monthly usage',
      href: '/dashboard/credits-planner',
      color: 'bg-amber-500/15 text-amber-500 dark:text-amber-300',
    },
  ]

  return (
    <Card className="overflow-hidden border-border/80 bg-card/80 shadow-sm backdrop-blur-sm constellation-bg">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg">Quick actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {actions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 border-border/60 bg-background/50 p-3.5 transition-colors hover:border-border hover:bg-secondary/40"
              >
                <div className={`rounded-lg border border-border/40 p-2 ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-medium leading-tight">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
