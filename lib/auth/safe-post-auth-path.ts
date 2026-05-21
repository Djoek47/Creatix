/** Relative in-app path only — blocks open redirects. */
export function safePostAuthPath(next: string | null | undefined): string {
  if (next == null || next === '') return '/dashboard'
  const t = next.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return '/dashboard'
  if (t.includes('://')) return '/dashboard'
  return t
}
