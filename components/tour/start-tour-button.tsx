'use client'

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
  const completed = useTourCompleted(fullAppWelcomeTour.tourId)

  return (
    <Button
      asChild
      className={cn(
        'gap-2 shadow-lg shadow-primary/15',
        !completed && 'tour-start-prompt',
        className,
      )}
      data-tour="header-start-tour"
      title={
        completed
          ? 'Run the full live app tour again (navigates real pages with highlights)'
          : 'Start the full live app tour (navigates real pages with highlights)'
      }
    >
      <Link href={LIVE_TOUR_HREF}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {completed ? 'Launch live tour' : 'Start live tour'}
      </Link>
    </Button>
  )
}
