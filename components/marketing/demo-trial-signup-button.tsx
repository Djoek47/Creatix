'use client'

import { Button } from '@/components/ui/button'
import {
  DEFAULT_TRIAL_SIGNUP_HREF,
  useTrialSignupTransition,
} from '@/components/marketing/trial-signup-transition'

/**
 * Demo page “Start free trial” — same video → `/auth/sign-up` flow as the home hero and header CTAs.
 */
export function DemoTrialSignupButton({ label }: { label: string }) {
  const { beginSignupTransition, isTransitioning } = useTrialSignupTransition()

  return (
    <div className="demo-trial-cta-shell my-2 w-full">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-full" aria-hidden>
        <span className="demo-trial-cta-aurora" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={isTransitioning}
        className="demo-trial-cta-edge relative z-[1] h-10 w-full min-h-[2.625rem] shrink-0 rounded-full border-primary/40 bg-card/55 px-4 text-sm font-semibold tracking-[-0.02em] shadow-[0_10px_26px_-11px] shadow-primary/20 ring-1 ring-violet-400/20 backdrop-blur-sm transition-[border-color,background-color,box-shadow] hover:border-primary/55 hover:bg-primary/[0.08] hover:shadow-[0_12px_28px_-10px] hover:shadow-primary/25 sm:h-11 sm:min-h-[2.75rem] sm:px-5 sm:text-base"
        onClick={() => beginSignupTransition(DEFAULT_TRIAL_SIGNUP_HREF)}
      >
        {label}
      </Button>
    </div>
  )
}
