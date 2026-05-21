'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { track } from '@vercel/analytics'

/**
 * Delegated click listener for `[data-marketing-conversion="{name}"]`.
 * Surfaces funnel events in Vercel Analytics for conversion-focused SEO QA.
 */
export function MarketingConversionClickListener({ children }: { children: ReactNode }) {
  useEffect(() => {
    function onPointerDown(ev: MouseEvent | PointerEvent): void {
      const el = (ev.target as Element | null)?.closest?.('[data-marketing-conversion]')
      if (!el || !(el instanceof HTMLElement)) return
      const name = el.dataset.marketingConversion?.trim()
      if (!name) return
      track(`marketing_${name}`)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

  return <>{children}</>
}
