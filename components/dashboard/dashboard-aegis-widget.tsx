'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowRight, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/** Compact Circe Aegis shortcut for the draggable dashboard grid. */
export function DashboardAegisWidget() {
  const t = useTranslations('dashboard.aegisPromo')
  return (
    <Card className="overflow-hidden border-circe/25 bg-gradient-to-br from-circe/[0.08] via-card to-transparent shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-serif text-base">
          <span className="rounded-lg border border-circe/30 bg-circe/10 p-1.5 text-circe">
            <Shield className="h-4 w-4" aria-hidden />
          </span>
          {t('title')}
        </CardTitle>
        <CardDescription className="text-xs leading-snug">
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <Button asChild size="sm" variant="secondary" className="w-full gap-2 border-circe/20 bg-circe/10 text-circe hover:bg-circe/15">
          <Link href="/dashboard/protection?severity=critical,high">
            {t('openLeakQueue')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="w-full gap-2 border-circe/25 text-circe hover:bg-circe/10">
          <Link href="/dashboard/protection/aegis">
            {t('aegisSettings')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
