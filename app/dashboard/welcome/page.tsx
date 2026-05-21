'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Sparkles } from 'lucide-react'
import { useTour } from '@/components/tour/tour-provider'
import { fullAppWelcomeTour } from '@/lib/tour-full-app-welcome'
import { useTourCompleted } from '@/components/tour/use-tour-completed'
import { cn } from '@/lib/utils'

/**
 * Dedicated route for the full-app orientation tour (see lib/tour-full-app-welcome.ts).
 * Open with ?openTour=1 to auto-start the tour (e.g. from onboarding or Guide).
 */
export default function WelcomeTourPage() {
  const t = useTranslations('dashboard.welcomeTour')
  const searchParams = useSearchParams()
  const { startTour } = useTour() ?? {}
  const startedRef = useRef(false)
  const fullTourDone = useTourCompleted(fullAppWelcomeTour.tourId)

  useEffect(() => {
    if (startedRef.current) return
    if (searchParams.get('openTour') !== '1') return
    if (!startTour) return
    startedRef.current = true
    const id = window.requestAnimationFrame(() => {
      startTour()
    })
    return () => window.cancelAnimationFrame(id)
  }, [searchParams, startTour])

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card
        data-tour="welcome-card"
        className="border-primary/25 bg-gradient-to-br from-amber-500/[0.06] via-background to-violet-500/[0.08]"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-amber-500" aria-hidden />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t.rich('description', {
              start: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              launch: (chunks) => <strong className="text-foreground">{chunks}</strong>,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            className={cn('gap-2', !fullTourDone && 'tour-start-prompt')}
            onClick={() => startTour?.()}
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            {fullTourDone ? t('launchTour') : t('startTour')}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard">{t('goDashboard')}</Link>
          </Button>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/dashboard/guide" className="text-primary underline hover:no-underline">
          {t('guideLink')}
        </Link>
        {' · '}
        <Link href="/dashboard/settings" className="text-primary underline hover:no-underline">
          {t('settingsLink')}
        </Link>
      </p>
    </div>
  )
}
