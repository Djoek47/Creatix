'use client'

import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

import {
  DEFAULT_TRIAL_SIGNUP_HREF,
  useTrialSignupTransition,
} from '@/components/marketing/trial-signup-transition'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type MarketingHeroTrialCtaProps = {
  label: ReactNode
  /** `hero` = home rainbow pill; `nav` = marketing header / sheet (same video + sign-up flow). */
  variant?: 'hero' | 'nav'
  className?: string
  /** Runs immediately after the transition is started (e.g. close mobile nav sheet). */
  afterPress?: () => void
}

/**
 * Single entry point for marketing trial sign-up: plays the launch video transition then routes to
 * {@link DEFAULT_TRIAL_SIGNUP_HREF}. Use for both “Start free trial” (hero) and “Get started” (chrome).
 */
export function MarketingHeroTrialCta({
  label,
  variant = 'hero',
  className,
  afterPress,
}: MarketingHeroTrialCtaProps) {
  const { beginSignupTransition, isTransitioning } = useTrialSignupTransition()

  const go = () => {
    beginSignupTransition(DEFAULT_TRIAL_SIGNUP_HREF)
    afterPress?.()
  }

  if (variant === 'nav') {
    return (
      <Button
        type="button"
        size="sm"
        disabled={isTransitioning}
        className={cn(
          'h-9 shrink-0 gap-1 whitespace-nowrap rounded-lg bg-gradient-to-r from-primary via-primary to-circe/90 px-2.5 text-[12px] font-medium tracking-[-0.01em] text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-[0.97] min-[400px]:gap-1.5 min-[400px]:px-3.5 min-[400px]:text-[13px] sm:px-4',
          className,
        )}
        onClick={go}
      >
        {label}
        <ArrowRight
          className="h-3.5 w-3.5 shrink-0 opacity-90 max-[360px]:hidden"
          aria-hidden
        />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={isTransitioning}
      className={cn(
        'cta-trial-cta-button h-12 gap-2.5 rounded-full bg-gradient-to-r from-primary to-circe/90 px-11 text-base font-semibold text-primary-foreground shadow-[0_22px_48px_-14px] shadow-primary/40 ring-1 ring-foreground/10 hover:brightness-[1.04] sm:h-14 sm:gap-3 sm:px-14 sm:text-lg sm:shadow-[0_28px_56px_-16px] sm:shadow-primary/45',
        className,
      )}
      onClick={go}
    >
      <span className="cta-trial-rainbow-label">{label}</span>
      <ArrowRight className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
    </Button>
  )
}
