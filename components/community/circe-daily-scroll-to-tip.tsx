'use client'

import { useEffect } from 'react'

/** Scrolls to `#tip-{id}` on the full tips page when opened from a hash link. */
export function CirceDailyScrollToTip() {
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '')
    if (!raw.startsWith('tip-')) return
    const el = document.getElementById(raw)
    if (!el) return

    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('ring-2', 'ring-circe/45', 'rounded-xl')
      window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-circe/45', 'rounded-xl')
      }, 2400)
    }, 120)

    return () => window.clearTimeout(t)
  }, [])

  return null
}
