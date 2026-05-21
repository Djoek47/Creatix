'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const pad = typeof step.highlightPaddingPx === 'number' ? Math.max(0, step.highlightPaddingPx) : 5
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (!el || !(el instanceof HTMLElement)) continue
    if (!isVisible(el)) continue
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const r = el.getBoundingClientRect()
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
  tourId: _tourId,
}: TourSpotlightProps) {
  const tUi = useTranslations('dashboard.tourUi')
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
                  className="pointer-events-auto absolute left-0 right-0 top-0 bg-neutral-950/28 dark:bg-black/32"
                  style={{ height: Math.max(0, rect.top) }}
                />
                <div
                  className="pointer-events-auto absolute bottom-0 left-0 right-0 bg-neutral-950/28 dark:bg-black/32"
                  style={{ top: rect.top + rect.height, height: Math.max(0, vh - rect.top - rect.height) }}
                />
                <div
                  className="pointer-events-auto absolute bg-neutral-950/28 dark:bg-black/32"
                  style={{
                    left: 0,
                    width: Math.max(0, rect.left),
                    top: rect.top,
                    height: rect.height,
                  }}
                />
                <div
                  className="pointer-events-auto absolute bg-neutral-950/28 dark:bg-black/32"
                  style={{
                    left: rect.left + rect.width,
                    right: 0,
                    top: rect.top,
                    height: rect.height,
                  }}
                />
                <motion.div
                  className="pointer-events-none absolute rounded-xl ring-2 ring-primary/40 dark:ring-primary/45"
                  style={{
                    boxShadow:
                      '0 0 0 1px color-mix(in oklch, var(--primary) 22%, transparent) inset, 0 0 32px -14px color-mix(in oklch, var(--primary) 22%, transparent), 0 12px 36px -20px rgba(0,0,0,0.4)',
                  }}
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
              <div className="pointer-events-auto absolute inset-0 bg-neutral-950/28 dark:bg-black/32" />
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 pb-6 sm:p-6 sm:pb-10">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cn(
                'pointer-events-auto relative w-full max-w-[26rem] overflow-hidden rounded-[1.25rem] outline-none',
                'border border-primary/25 bg-background/75 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55),0_0_60px_-28px_color-mix(in_oklch,var(--primary)_18%,transparent)]',
                'dark:border-primary/20 dark:bg-white/[0.07]',
              )}
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-primary/[0.14] via-circe/[0.06] to-transparent opacity-[0.92] dark:from-primary/[0.16] dark:via-circe/[0.08] dark:to-transparent"
                aria-hidden
              />
              <div className="relative px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/18 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] dark:bg-primary/[0.14]">
                    <BookOpen className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary/90 dark:text-primary">
                      {tUi('stepProgress', { current: stepIndex + 1, total: steps.length })}
                    </div>
                  </div>
                </div>
                <h2 id={titleId} className="text-pretty text-xl font-semibold leading-snug tracking-tight text-foreground">
                  {step.title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground" aria-live="polite">
                  {step.description}
                </p>
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-primary/15 pt-5 dark:border-primary/12">
                  <div>
                    {!isFirst ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="h-10 gap-1.5 rounded-full px-4 text-[13px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-foreground dark:hover:bg-primary/10"
                      >
                        <ChevronLeft className="h-4 w-4 opacity-70" />
                        {tUi('back')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-10 rounded-full px-4 text-[13px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-foreground dark:hover:bg-primary/10"
                      >
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
                        aria-label={tUi('finishAria')}
                        className="h-10 rounded-full bg-primary px-6 text-[13px] font-medium text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset] transition-opacity hover:opacity-90"
                      >
                        {tUi('done')}
                      </Button>
                    ) : (
                      <Button
                        ref={primaryActionRef}
                        type="button"
                        size="sm"
                        onClick={onNext}
                        className="h-10 gap-1 rounded-full bg-primary px-6 text-[13px] font-medium text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset] transition-opacity hover:opacity-90"
                      >
                        {tUi('next')}
                        <ChevronRight className="h-4 w-4 opacity-90" />
                      </Button>
                    )}
                  </div>
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
