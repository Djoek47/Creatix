'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { fullAppWelcomeTour } from '@/lib/tour-full-app-welcome'
import { useTourCompleted } from './use-tour-completed'
import { cn } from '@/lib/utils'

const LIVE_TOUR_HREF = '/dashboard/welcome?openTour=1'

/**
 * Same entry as Guide “Launch live tour”: navigates to Welcome with ?openTour=1 so the full-app tour auto-starts.
 */
export function StartTourButton({ className }: { className?: string }) {
  const t = useTranslations('dashboard')
  const completed = useTourCompleted(fullAppWelcomeTour.tourId)

  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        'h-9 gap-2 rounded-full border-amber-500/50 bg-amber-400/[0.14] px-4 text-[13px] font-semibold text-amber-950 shadow-none transition-all duration-300 hover:border-amber-500/65 hover:bg-amber-400/[0.24] dark:border-amber-400/45 dark:bg-amber-400/[0.12] dark:text-amber-100 dark:hover:border-amber-300/60 dark:hover:bg-amber-400/[0.2]',
        !completed && 'tour-start-prompt',
        className,
      )}
      data-tour="header-start-tour"
      title={
        completed ? t('startTour.linkTitleCompleted') : t('startTour.linkTitleNotCompleted')
      }
    >
      <Link href={LIVE_TOUR_HREF} className="flex items-center gap-2">
        <Sparkles
          className="h-4 w-4 shrink-0 text-amber-700 motion-safe:animate-pulse dark:text-amber-200"
          aria-hidden
        />
        {completed ? t('startTour.launchLiveTour') : t('startTour.startLiveTour')}
      </Link>
    </Button>
  )
}
