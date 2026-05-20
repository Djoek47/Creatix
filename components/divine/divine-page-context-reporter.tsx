'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const MAX_VISIBLE_CONTEXT = 1800

function compactVisibleText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\b\d{4,}\b/g, (match) => (match.length > 8 ? `${match.slice(0, 4)}...` : match))
    .trim()
    .slice(0, MAX_VISIBLE_CONTEXT)
}

function readDashboardPageContext(reason: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  const main =
    document.querySelector('[data-divine-page-context]') ||
    document.querySelector('main') ||
    document.querySelector('#dashboard-main-shell') ||
    document.body
  const title =
    document.querySelector('[data-divine-page-title]')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title ||
    'Dashboard'
  const visibleSummary = compactVisibleText((main as HTMLElement).innerText || '')
  return {
    surface: 'dashboard',
    path: `${window.location.pathname}${window.location.search}`,
    title: title.slice(0, 140),
    visibleSummary,
    reason,
    capturedAt: new Date().toISOString(),
  }
}

function dispatchDashboardPageContext(reason: string) {
  const context = readDashboardPageContext(reason)
  if (!context) return
  window.dispatchEvent(new CustomEvent('creatix:divine-page-context', { detail: context }))
}

export function DivinePageContextReporter() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()

  useEffect(() => {
    const timers = [
      window.setTimeout(() => dispatchDashboardPageContext('route_changed'), 250),
      window.setTimeout(() => dispatchDashboardPageContext('route_settled'), 1100),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [pathname, search])

  useEffect(() => {
    const onRefresh = () => {
      window.setTimeout(() => dispatchDashboardPageContext('data_refresh_started'), 80)
      window.setTimeout(() => dispatchDashboardPageContext('data_refresh_settled'), 1300)
    }
    const onRequest = () => {
      window.setTimeout(() => dispatchDashboardPageContext('requested_recheck'), 80)
    }
    window.addEventListener('creatix:dashboard-data-refresh', onRefresh)
    window.addEventListener('creatix:divine-request-page-context', onRequest)
    return () => {
      window.removeEventListener('creatix:dashboard-data-refresh', onRefresh)
      window.removeEventListener('creatix:divine-request-page-context', onRequest)
    }
  }, [])

  return null
}
