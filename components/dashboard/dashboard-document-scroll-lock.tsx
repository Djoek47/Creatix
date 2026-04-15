'use client'

import { useLayoutEffect } from 'react'

/**
 * Dashboard scrolls inside <main>. Without locking the document, html/body can
 * also scroll (min-height + viewport quirks), producing two vertical scrollbars.
 */
export function DashboardDocumentScrollLock() {
  useLayoutEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [])
  return null
}
