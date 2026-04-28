'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TourStep } from '@/lib/tour-types'

interface TourDialogProps {
  open: boolean
  onClose: () => void
  steps: TourStep[]
  stepIndex: number
  onNext: () => void
  onBack: () => void
  tourId: string
}

export function TourDialog({
  open,
  onClose,
  steps,
  stepIndex,
  onNext,
  onBack,
  tourId: _tourId,
}: TourDialogProps) {
  if (steps.length === 0) return null
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-neutral-950/45 backdrop-blur-md dark:bg-black/55"
        className={cn(
          'gap-0 overflow-hidden rounded-[1.25rem] border-primary/25 bg-background/75 p-0 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55),0_0_60px_-28px_color-mix(in_oklch,var(--primary)_18%,transparent)] backdrop-blur-2xl dark:border-primary/20 dark:bg-white/[0.07] sm:max-w-[26rem]',
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-primary/[0.14] via-circe/[0.06] to-transparent opacity-[0.92] dark:from-primary/[0.16] dark:via-circe/[0.08] dark:to-transparent"
          aria-hidden
        />
        <div className="relative grid gap-0 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <DialogHeader className="space-y-0 text-left">
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/18 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] dark:bg-primary/[0.14]">
                <BookOpen className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary/90 dark:text-primary">
                  Step {stepIndex + 1} of {steps.length}
                </div>
              </div>
            </div>
            <DialogTitle className="text-pretty text-xl font-semibold leading-snug tracking-tight">
              {step.title}
            </DialogTitle>
            <DialogDescription className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {step.description}
            </DialogDescription>
          </DialogHeader>
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
                  Back
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
                  type="button"
                  size="sm"
                  onClick={onClose}
                  aria-label="Finish tour"
                  className="h-10 rounded-full bg-primary px-6 text-[13px] font-medium text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset] hover:opacity-90"
                >
                  Done
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={onNext}
                  className="h-10 gap-1 rounded-full bg-primary px-6 text-[13px] font-medium text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset] hover:opacity-90"
                >
                  Next
                  <ChevronRight className="h-4 w-4 opacity-90" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
