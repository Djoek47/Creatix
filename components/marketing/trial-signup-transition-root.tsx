'use client'

import type { ReactNode } from 'react'

import { TrialSignupTransitionProvider } from '@/components/marketing/trial-signup-transition'

export function TrialSignupTransitionRoot({ children }: { children: ReactNode }) {
  return <TrialSignupTransitionProvider>{children}</TrialSignupTransitionProvider>
}
