'use client'

import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import { useTour } from './tour-provider'
import { getTourForPath, TOUR_STORAGE_PREFIX } from '@/lib/tour-config'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

function getTourCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(TOUR_STORAGE_PREFIX + tourId) === '1'
  } catch {
    return false
  }
}

export function StartTourButton({ className }: { className?: string }) {
  const pathname = usePathname()
  const { startTour } = useTour() ?? {}
  const config = useMemo(() => getTourForPath(pathname ?? '/dashboard'), [pathname])
  const completed = config ? getTourCompleted(config.tourId) : true
  const hasSteps = (config?.steps.length ?? 0) > 0

  if (!hasSteps || !startTour) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={startTour}
      title={completed ? 'Show page walkthrough again' : 'Start page walkthrough (dialog tour)'}
    >
      <BookOpen className="h-4 w-4 mr-1.5" />
      {completed ? 'Tutorial' : 'Start Tour'}
    </Button>
  )
}
