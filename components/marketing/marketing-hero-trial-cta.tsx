'use client'

import { ArrowRight } from 'lucide-react'

import { useTrialSignupTransition } from '@/components/marketing/trial-signup-transition'
import { Button } from '@/components/ui/button'

type Props = { label: string }

export function MarketingHeroTrialCta({ label }: Props) {
  const { beginSignupTransition, isTransitioning } = useTrialSignupTransition()

  return (
    <Button
      type="button"
      size="lg"
      disabled={isTransitioning}
      className="cta-trial-cta-button h-12 gap-2.5 rounded-full bg-gradient-to-r from-primary to-circe/90 px-11 text-base font-semibold text-primary-foreground shadow-[0_22px_48px_-14px] shadow-primary/40 ring-1 ring-foreground/10 hover:brightness-[1.04] sm:h-14 sm:gap-3 sm:px-14 sm:text-lg sm:shadow-[0_28px_56px_-16px] sm:shadow-primary/45"
      onClick={() => beginSignupTransition('/auth/sign-up')}
    >
      <span className="cta-trial-rainbow-label">{label}</span>
      <ArrowRight className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
    </Button>
  )
}
