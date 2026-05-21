'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ListTree, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

/** Settings entry point: full UI lives under Fans → Arrangements. */
export function HousekeepingListsSettings({
  fanPlatformConnected,
}: {
  fanPlatformConnected: boolean
}) {
  const t = useTranslations('settings')
  if (!fanPlatformConnected) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ListTree className="h-5 w-5" />
          {t('housekeeping.title')}
        </CardTitle>
        <CardDescription>{t('housekeeping.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="secondary" className="gap-2">
          <Link href="/dashboard/fans#arrangements">
            <Sparkles className="h-4 w-4" />
            {t('housekeeping.cta')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
