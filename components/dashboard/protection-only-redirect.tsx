'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const ALLOW_PREFIXES = ['/dashboard/protection', '/dashboard/settings', '/dashboard/mentions']

/**
 * If the user is on Protection (no main cev-paid) they stay in a focused shell — redirect away from
 * full dashboard routes to `/dashboard/protection` (settings remains reachable for billing).
 */
export function ProtectionOnlyRedirect({ protectionOnly }: { protectionOnly: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!protectionOnly) return
    if (ALLOW_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return
    if (pathname.startsWith('/dashboard')) {
      router.replace('/dashboard/protection')
    }
  }, [protectionOnly, pathname, router])

  return null
}
