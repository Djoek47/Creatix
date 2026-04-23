'use client'

import { useReducedMotion } from 'framer-motion'

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const EASE_STANDARD = [0.2, 0.8, 0.2, 1] as const

export function useUiMotionPreferences() {
  const reduced = useReducedMotion()
  return { reduced: Boolean(reduced) }
}

export function uiFadeTransition(reduced: boolean) {
  return reduced
    ? { duration: 0 }
    : {
        duration: 0.22,
        ease: EASE_STANDARD,
      }
}

export function uiPanelTransition(reduced: boolean) {
  return reduced
    ? { duration: 0 }
    : {
        duration: 0.28,
        ease: EASE_OUT,
      }
}

export function uiListItemTransition(reduced: boolean) {
  return reduced
    ? { duration: 0 }
    : {
        duration: 0.18,
        ease: EASE_STANDARD,
      }
}
