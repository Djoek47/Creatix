'use client'

import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import { useTour } from './tour-provider'
import { getTourForPath } from '@/lib/tour-config'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { useTourCompleted } from './use-tour-completed'
import { cn } from '@/lib/utils'

export function StartTourButton({ className }: { className?: string }) {
  const pathname = usePathname()
  const { startTour } = useTour() ?? {}
  const config = useMemo(() => getTourForPath(pathname ?? '/dashboard'), [pathname])
  const tourId = config?.tourId
  const completed = useTourCompleted(tourId)
  const hasSteps = (config?.steps.length ?? 0) > 0

  if (!hasSteps || !startTour) return null

  const isFullWelcome = pathname === '/dashboard/welcome'
  const label = completed ? 'Launch Tour' : 'Start Tour'
  const title = completed
    ? isFullWelcome
      ? 'Run the full live app tour again (navigates real pages with highlights)'
      : 'Launch the live page tour again (spotlight steps for this screen)'
    : isFullWelcome
      ? 'Start the full live app tour (navigates real pages with highlights)'
      : 'Start the live page tour (spotlight steps for this screen)'

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        className,
        !completed && 'tour-start-prompt',
      )}
      data-tour="header-start-tour"
      onClick={startTour}
      title={title}
    >
      <BookOpen className="h-4 w-4 mr-1.5" aria-hidden />
      {label}
    </Button>
  )
}
