'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import type { TourStep } from '@/lib/tour-types'

const MEASURE_MAX_ATTEMPTS = 32

interface TourSpotlightProps {
  open: boolean
  pathname: string
  onClose: () => void
  steps: TourStep[]
  stepIndex: number
  onNext: () => void
  onBack: () => void
  tourId: string
}

type Rect = { top: number; left: number; width: number; height: number }

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return true
}

function measureTarget(step: TourStep): Rect | null {
  const selectors = [step.targetSelector, step.targetSelectorFallback].filter(Boolean) as string[]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (!el || !(el instanceof HTMLElement)) continue
    if (!isVisible(el)) continue
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const r = el.getBoundingClientRect()
    const pad = 6
    return {
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    }
  }
  return null
}

export function TourSpotlight({
  open,
  pathname,
  onClose,
  steps,
  stepIndex,
  onNext,
  onBack,
  tourId,
}: TourSpotlightProps) {
  const [mounted, setMounted] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)
  const primaryActionRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  useEffect(() => {
    if (!open || !step?.targetSelector) {
      setRect(null)
      return
    }
    let cancelled = false
    let attempt = 0

    const tick = () => {
      if (cancelled) return
      const m = measureTarget(step)
      if (m) {
        setRect(m)
        return
      }
      attempt++
      if (attempt >= MEASURE_MAX_ATTEMPTS) {
        setRect(null)
        return
      }
      const delay = attempt < 14 ? 24 : 56
      window.setTimeout(() => {
        requestAnimationFrame(tick)
      }, delay)
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [open, step, pathname, stepIndex])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => {
      primaryActionRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, stepIndex, isLast, isFirst])

  useEffect(() => {
    if (!open || !step?.targetSelector) return
    const onResize = () => {
      const m = measureTarget(step)
      setRect(m ?? null)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open, step])

  if (!mounted || steps.length === 0 || !step) return null

  const vh = typeof window !== 'undefined' ? window.innerHeight : 0

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {rect ? (
              <>
                <div
                  className="pointer-events-auto absolute left-0 right-0 top-0 bg-black/72"
                  style={{ height: Math.max(0, rect.top) }}
                />
                <div
                  className="pointer-events-auto absolute bottom-0 left-0 right-0 bg-black/72"
                  style={{ top: rect.top + rect.height, height: Math.max(0, vh - rect.top - rect.height) }}
                />
                <div
                  className="pointer-events-auto absolute bg-black/72"
                  style={{
                    left: 0,
                    width: Math.max(0, rect.left),
                    top: rect.top,
                    height: rect.height,
                  }}
                />
                <div
                  className="pointer-events-auto absolute bg-black/72"
                  style={{
                    left: rect.left + rect.width,
                    right: 0,
                    top: rect.top,
                    height: rect.height,
                  }}
                />
                <motion.div
                  className="pointer-events-none absolute rounded-lg ring-2 ring-amber-400/90"
                  initial={false}
                  animate={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              </>
            ) : (
              <div className="pointer-events-auto absolute inset-0 bg-black/72" />
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 pb-6 sm:p-6 sm:pb-8">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="pointer-events-auto w-full max-w-md rounded-xl border border-primary/25 bg-card/95 p-4 shadow-2xl backdrop-blur-md outline-none sm:p-5"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                <BookOpen className="h-4 w-4" aria-hidden />
                <span className="text-xs">
                  Step {stepIndex + 1} of {steps.length}
                </span>
                {process.env.NODE_ENV === 'development' && (
                  <span className="text-[10px] font-mono opacity-70">{tourId}</span>
                )}
              </div>
              <h2 id={titleId} className="text-lg font-semibold leading-snug">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground" aria-live="polite">
                {step.description}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div>
                  {!isFirst ? (
                    <Button type="button" variant="outline" size="sm" onClick={onBack} className="gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                      Skip tour
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {isLast ? (
                    <Button
                      ref={primaryActionRef}
                      type="button"
                      size="sm"
                      onClick={onClose}
                      aria-label="Finish tour"
                    >
                      Done
                    </Button>
                  ) : (
                    <Button ref={primaryActionRef} type="button" size="sm" onClick={onNext} className="gap-1">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(overlay, document.body)
}
