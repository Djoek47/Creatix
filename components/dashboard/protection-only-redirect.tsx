'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** Routes that require creator API / automation — blocked for Protection-only (non-API) tier. */
const BLOCKED_PREFIXES = [
  '/dashboard/messages',
  '/dashboard/social',
  '/dashboard/commenter',
  '/dashboard/divine-manager',
  '/dashboard/ai-studio',
  '/dashboard/retention',
  '/mobile/onlyfans-connect',
] as const

function isBlockedPath(pathname: string): boolean {
  return BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Non-API users keep the same shell but are steered away from API-heavy routes (messaging, OF connect, etc.).
 * Dashboard, protection, content planner, fans, mentions, settings remain available.
 */
export function ProtectionOnlyRedirect({ blockApiSurfaces }: { blockApiSurfaces: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!blockApiSurfaces) return
    if (!isBlockedPath(pathname)) return
    if (pathname.startsWith('/dashboard')) {
      router.replace('/dashboard/settings?tab=billing')
    } else if (pathname.startsWith('/mobile/')) {
      router.replace('/dashboard/protection')
    }
  }, [blockApiSurfaces, pathname, router])

  return null
}
