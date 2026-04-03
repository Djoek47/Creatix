import type { NextRequest } from 'next/server'

/**
 * When ADMIN_IP_ALLOWLIST is set (comma-separated IPs / CIDRs not supported — exact IPs only),
 * only those client IPs may access /admin routes. Empty env = allow all.
 */
export function isAdminIpAllowed(request: NextRequest): boolean {
  const raw = process.env.ADMIN_IP_ALLOWLIST?.trim()
  if (!raw) return true

  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    (forwarded?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      '') ||
    ''

  if (!ip) return false

  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return allowed.includes(ip)
}
