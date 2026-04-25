/**
 * After password login, the user may be redirected to the main app, or to
 * a Markit handoff URL (same Supabase project) with session tokens in the URL
 * hash — fragment is not sent to the server.
 */

const DEFAULT_PATH = '/dashboard'

function normalizeBaseUrl(base: string): string {
  return base.replace(/\/$/, '')
}

export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('..')) return false
  return true
}

/**
 * `next` must be a full Markit URL whose origin is allowlisted in env.
 */
export function isAllowedMarkitHandoff(
  next: string,
  markitBases: string,
): boolean {
  const bases = markitBases
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean)
    .map(normalizeBaseUrl)
  if (bases.length === 0) return false
  try {
    const u = new URL(next)
    if (u.pathname !== '/auth/complete') return false
    if (u.hash && u.hash.length > 0) return false
    return bases.some((b) => u.origin === new URL(b).origin)
  } catch {
    return false
  }
}

export function buildMarkitHandoffWithSessionHash(
  markitCompleteUrl: string,
  session: { access_token: string; refresh_token: string; expires_in?: number },
): string {
  const u = new URL(markitCompleteUrl)
  const p = new URLSearchParams()
  p.set('access_token', session.access_token)
  p.set('refresh_token', session.refresh_token)
  p.set('expires_in', String(session.expires_in ?? 3600))
  p.set('token_type', 'bearer')
  u.hash = p.toString()
  return u.toString()
}

export function getPostPasswordLoginDestination(
  nextParam: string | null,
  markitBases: string,
): { kind: 'internal'; path: string } | { kind: 'markit_handoff'; href: string } {
  if (!nextParam) {
    return { kind: 'internal', path: DEFAULT_PATH }
  }
  const trimmed = nextParam.trim()
  if (isAllowedMarkitHandoff(trimmed, markitBases)) {
    return { kind: 'markit_handoff', href: trimmed }
  }
  if (isSafeInternalPath(trimmed)) {
    return { kind: 'internal', path: trimmed }
  }
  return { kind: 'internal', path: DEFAULT_PATH }
}
