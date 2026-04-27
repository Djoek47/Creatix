'use client'

import { useEffect, useState } from 'react'
import {
  CREATIX_TOUR_COMPLETED_EVENT,
  type CreatixTourCompletedDetail,
  readTourCompleted,
} from '@/lib/tour-config'

/** True once this tour id is marked done in localStorage; updates when completion fires in the same tab. */
export function useTourCompleted(tourId: string | null | undefined) {
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!tourId) {
      setCompleted(false)
      return
    }
    setCompleted(readTourCompleted(tourId))
    const onDone = (e: Event) => {
      const d = (e as CustomEvent<CreatixTourCompletedDetail>).detail
      if (d?.tourId === tourId) setCompleted(true)
    }
    window.addEventListener(CREATIX_TOUR_COMPLETED_EVENT, onDone)
    return () => window.removeEventListener(CREATIX_TOUR_COMPLETED_EVENT, onDone)
  }, [tourId])

  return completed
}
