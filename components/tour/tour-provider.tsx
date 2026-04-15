'use client'

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getTourForPath, TOUR_STORAGE_PREFIX } from '@/lib/tour-config'
import { TourDialog } from './tour-dialog'
import { TourSpotlight } from './tour-spotlight'
import type { TourConfig } from '@/lib/tour-types'

function setTourCompleted(tourId: string) {
  try {
    localStorage.setItem(TOUR_STORAGE_PREFIX + tourId, '1')
  } catch {
    // ignore
  }
}

function normalizePath(p: string): string {
  return p.replace(/\/$/, '') || '/dashboard'
}

/** Canonical path+query for comparing tour navigation targets. */
function tourRouteKey(href: string): string {
  try {
    const u = new URL(href, 'http://tour.local')
    const path = normalizePath(u.pathname)
    const sorted = [...u.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    return sorted ? `${path}?${sorted}` : path
  } catch {
    return normalizePath(href)
  }
}

function currentRouteKey(pathname: string, searchParams: URLSearchParams): string {
  const path = normalizePath(pathname)
  const sorted = [...searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return sorted ? `${path}?${sorted}` : path
}

function isInteractiveTour(config: TourConfig): boolean {
  return config.steps.some((s) => s.path != null || s.targetSelector != null)
}

type TourContextValue = {
  startTour: () => void
  isOpen: boolean
  currentTourId: string | null
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTour() {
  const ctx = useContext(TourContext)
  return ctx
}

function TourProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathConfig = useMemo(() => getTourForPath(pathname ?? '/dashboard'), [pathname])
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null)

  const config = open && activeTour ? activeTour : pathConfig

  const startTour = useCallback(() => {
    const c = getTourForPath(pathname ?? '/dashboard')
    if (!c || c.steps.length === 0) return
    setActiveTour(c)
    setStepIndex(0)
    setOpen(true)
  }, [pathname])

  useEffect(() => {
    if (!open || !activeTour) return
    const step = activeTour.steps[stepIndex]
    if (!step?.path) return
    const target = tourRouteKey(step.path)
    const cur = currentRouteKey(pathname ?? '', searchParams)
    if (cur !== target) {
      router.push(step.path)
    }
  }, [open, activeTour, stepIndex, pathname, searchParams, router])

  const onNext = useCallback(() => {
    if (!activeTour) return
    if (stepIndex < activeTour.steps.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      setTourCompleted(activeTour.tourId)
      setOpen(false)
      setActiveTour(null)
    }
  }, [activeTour, stepIndex])

  const onBack = useCallback(() => {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }, [stepIndex])

  const onClose = useCallback(() => {
    if (activeTour) setTourCompleted(activeTour.tourId)
    setOpen(false)
    setActiveTour(null)
  }, [activeTour])

  const value = useMemo<TourContextValue>(
    () => ({
      startTour,
      isOpen: open,
      currentTourId: config?.tourId ?? null,
    }),
    [startTour, open, config?.tourId]
  )

  const showTour = open && activeTour && activeTour.steps.length > 0
  const interactive = activeTour ? isInteractiveTour(activeTour) : false

  return (
    <TourContext.Provider value={value}>
      {children}
      {showTour &&
        (interactive ? (
          <TourSpotlight
            open={open}
            pathname={pathname ?? ''}
            onClose={onClose}
            steps={activeTour.steps}
            stepIndex={stepIndex}
            onNext={onNext}
            onBack={onBack}
            tourId={activeTour.tourId}
          />
        ) : (
          <TourDialog
            open={open}
            onClose={onClose}
            steps={activeTour.steps}
            stepIndex={stepIndex}
            onNext={onNext}
            onBack={onBack}
            tourId={activeTour.tourId}
          />
        ))}
    </TourContext.Provider>
  )
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TourProviderInner>{children}</TourProviderInner>
    </Suspense>
  )
}
