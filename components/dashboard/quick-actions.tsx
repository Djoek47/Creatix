'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, MessageSquare, BarChart3, HeartPulse, WalletCards, Users } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function QuickActions() {
  const t = useTranslations('dashboard.quickActions')
  const actions = [
    {
      icon: Upload,
      labelKey: 'upload.label' as const,
      descriptionKey: 'upload.description' as const,
      href: '/dashboard/content/new',
      color: 'bg-chart-1/10 text-chart-1',
    },
    {
      icon: Users,
      labelKey: 'fans.label' as const,
      descriptionKey: 'fans.description' as const,
      href: '/dashboard/fans',
      color: 'bg-chart-2/10 text-chart-2',
    },
    {
      icon: MessageSquare,
      labelKey: 'massMessage.label' as const,
      descriptionKey: 'massMessage.description' as const,
      href: '/dashboard/messages/mass',
      color: 'bg-chart-3/10 text-chart-3',
    },
    {
      icon: BarChart3,
      labelKey: 'reports.label' as const,
      descriptionKey: 'reports.description' as const,
      href: '/dashboard/analytics',
      color: 'bg-chart-4/10 text-chart-4',
    },
    {
      icon: HeartPulse,
      labelKey: 'wellBeing.label' as const,
      descriptionKey: 'wellBeing.description' as const,
      href: '/dashboard/well-being',
      color: 'bg-circe/15 text-circe dark:text-circe-light',
    },
    {
      icon: WalletCards,
      labelKey: 'creditsPlanner.label' as const,
      descriptionKey: 'creditsPlanner.description' as const,
      href: '/dashboard/credits-planner',
      color: 'bg-amber-500/15 text-amber-500 dark:text-amber-300',
    },
  ]

  return (
    <Card className="overflow-hidden border-border/80 bg-card/80 shadow-sm backdrop-blur-sm constellation-bg">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {actions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 border-border/60 bg-background/50 p-3.5 transition-colors hover:border-border hover:bg-secondary/40"
              >
                <div className={`rounded-lg border border-border/40 p-2 ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-medium leading-tight">{t(action.labelKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(action.descriptionKey)}</p>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
